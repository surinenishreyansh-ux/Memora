const Event = require('../models/Event');
const Photo = require('../models/Photo');
const Face = require('../models/Face');
const PersonCluster = require('../models/PersonCluster');
const GuestSearch = require('../models/GuestSearch');
const { processPhotosWithLocalAi, matchFaceWithLocalAi } = require('../services/localAiService');

/**
 * Utility for cosine distance between two normalized vectors
 * For normalized vectors: dist = 1 - dotProduct
 */
const cosineDistance = (a, b) => {
  if (!a || !b || a.length !== b.length) return 1.0;
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  // Clamp dotProduct to [-1, 1] to avoid precision errors
  dotProduct = Math.max(-1, Math.min(1, dotProduct));
  return 1.0 - dotProduct;
};

// @desc    Process event photos with REAL AI
// @route   POST /api/ai/process-event/:eventId
const processEvent = async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);

    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    console.log(`\n[AI-OVERHAUL] Starting Processing for: ${event.name}`);
    
    // Clear old data for this event
    await Face.deleteMany({ eventId });
    await PersonCluster.deleteMany({ eventId });
    await Photo.updateMany({ eventId }, { processed: false });

    event.processingStatus = 'processing';
    await event.save();

    // Run in background
    (async () => {
      try {
        const photos = await Photo.find({ eventId });
        const aiData = await processPhotosWithLocalAi(eventId, photos);
        
        console.log(`[AI-OVERHAUL] Service returned ${aiData.faces.length} faces and ${aiData.clusters.length} clusters.`);

        // 1. Create PersonCluster records
        const clusterIdToMongoId = {};
        for (const clusterData of aiData.clusters) {
            const cluster = await PersonCluster.create({
                eventId,
                clusterId: clusterData.clusterId,
                photoIds: clusterData.photoIds, // AI service returns IDs we sent
                faceIds: [] // Will populate after creating Face records
            });
            clusterIdToMongoId[clusterData.clusterId] = cluster._id;
        }

        // 2. Create Face records
        const faceInternalIdToMongoId = {};
        for (const faceData of aiData.faces) {
            const face = await Face.create({
                eventId,
                photoId: faceData.photoId,
                faceIndex: faceData.faceIndex,
                boundingBox: faceData.boundingBox,
                confidence: faceData.confidence,
                embedding: faceData.embedding,
                personClusterId: clusterIdToMongoId[faceData.clusterId]
            });
            faceInternalIdToMongoId[faceData.id] = face._id;
            
            // Link face to cluster
            await PersonCluster.findByIdAndUpdate(clusterIdToMongoId[faceData.clusterId], {
                $push: { faceIds: face._id }
            });
        }

        await Photo.updateMany({ eventId }, { processed: true });

        event.processingStatus = 'completed';
        await event.save();
        console.log(`[AI-OVERHAUL] Successfully completed for ${eventId}`);
      } catch (err) {
        console.error('[AI-OVERHAUL] Processing error:', err);
        event.processingStatus = 'failed';
        await event.save();
      }
    })();

    res.json({ message: 'Face clustering started' });
  } catch (error) {
    next(error);
  }
};

// @desc    Guest searches for their face
// @route   POST /api/ai/match-face/:eventId
const matchFace = async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const { selectedPhotoId } = req.body;
    const faceCropFile = req.file;

    if (!faceCropFile) {
      res.status(400);
      throw new Error('No face crop provided');
    }

    console.log(`\n[AI-OVERHAUL] Matching face in event ${eventId}`);

    // 1. Get embedding from Python service
    const { embedding } = await matchFaceWithLocalAi(eventId, faceCropFile.buffer);

    // 2. Nearest-Neighbor Search among all stored faces for this event
    const faces = await Face.find({ eventId });
    
    let nearestFace = null;
    let minDistance = 1.0;
    const DISTANCE_THRESHOLD = 0.2; // Strict threshold for Facenet512 (cosine distance)

    for (const face of faces) {
      if (!face.embedding || face.embedding.length === 0) continue;
      
      const dist = cosineDistance(embedding, face.embedding);
      if (dist < minDistance) {
        minDistance = dist;
        nearestFace = face;
      }
    }

    console.log(`[AI-OVERHAUL] Nearest match distance: ${minDistance.toFixed(4)}`);

    if (!nearestFace || minDistance > DISTANCE_THRESHOLD) {
        console.log(`[AI-OVERHAUL] No confident match found (Min dist: ${minDistance.toFixed(4)} > ${DISTANCE_THRESHOLD})`);
        return res.status(404).json({
            success: false,
            message: "No strong match found. Try selecting a clearer face."
        });
    }

    console.log(`[AI-OVERHAUL] Confident match found! (Face ${nearestFace._id})`);
    const matchedClusterId = nearestFace.personClusterId;
    const cluster = await PersonCluster.findById(matchedClusterId).populate('photoIds');

    if (!cluster) {
        return res.status(404).json({
            success: false,
            message: "Matched cluster no longer exists."
        });
    }

    // Return the photos from the cluster
    const photos = cluster.photoIds.sort((a, b) => b.qualityScore - a.qualityScore);

    const guestSearch = await GuestSearch.create({
      eventId,
      selectedPhotoId,
      matchedClusterId,
      matchedPhotoIds: photos.map(p => p._id),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.json({ 
      success: true,
      searchId: guestSearch._id,
      photos,
      minDistance
    });
  } catch (error) {
    console.error('[AI-OVERHAUL] Match Error:', error.message);
    next(error);
  }
};

const getResults = async (req, res, next) => {
  try {
    const search = await GuestSearch.findById(req.params.searchId).populate({
      path: 'matchedPhotoIds',
      options: { sort: { qualityScore: -1 } }
    });
    
    if (!search) {
      res.status(404);
      throw new Error('Search session expired');
    }

    res.json({
      photos: search.matchedPhotoIds,
      eventId: search.eventId,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSearchData = async (req, res, next) => {
  try {
    await GuestSearch.findByIdAndDelete(req.params.searchId);
    res.json({ message: 'Search data deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processEvent,
  matchFace,
  getResults,
  deleteSearchData,
};
