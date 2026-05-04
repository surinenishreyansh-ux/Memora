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

    if (!event || event.studioId.toString() !== req.user._id.toString()) {
      res.status(404);
      throw new Error('Event not found');
    }

    console.log(`\n[PRECISION-AI] Starting High-Precision Processing for: ${event.name}`);
    
    // Clear old data
    await Face.deleteMany({ eventId });
    await PersonCluster.deleteMany({ eventId });
    await Photo.updateMany({ eventId }, { processed: false });

    event.processingStatus = 'processing';
    await event.save();

    (async () => {
      try {
        const photos = await Photo.find({ eventId });
        const aiData = await processPhotosWithLocalAi(eventId, photos);
        
        console.log(`[PRECISION-AI] Service returned ${aiData.faces.length} faces and ${Object.keys(aiData.clusters).length} clusters.`);

        // 1. Create PersonCluster records
        const clusterMap = {}; 
        
        for (const [label, photoIdsRaw] of Object.entries(aiData.clusters)) {
          // Remove duplicates
          const photoIds = [...new Set(photoIdsRaw)];
          
          const cluster = await PersonCluster.create({
            eventId,
            clusterName: `Identity ${label}`,
            photoIds,
            bestPhotoIds: photoIds.slice(0, 3)
          });
          clusterMap[label] = cluster._id;
        }

        // 2. Create Face records with embeddings
        for (const faceData of aiData.faces) {
          await Face.create({
            eventId,
            photoId: faceData.photoId,
            faceExternalId: `local-${faceData.photoId}-${Math.random().toString(36).substr(2, 5)}`,
            boundingBox: faceData.boundingBox,
            confidence: faceData.confidence,
            embedding: faceData.embedding, 
            personClusterId: clusterMap[faceData.clusterId]
          });
        }

        await Photo.updateMany({ eventId }, { processed: true });

        event.processingStatus = 'completed';
        await event.save();
        console.log(`[PRECISION-AI] Successfully completed clustering for ${eventId}`);
      } catch (err) {
        console.error('[PRECISION-AI] Processing error:', err);
        event.processingStatus = 'failed';
        await event.save();
      }
    })();

    res.json({ message: 'High-precision processing started' });
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

    console.log(`\n[SEARCH-AI] Matching face in event ${eventId}`);

    // 1. Get embedding from Python service
    const { embedding } = await matchFaceWithLocalAi(eventId, faceCropFile.buffer);

    // 2. Nearest-Neighbor Search among all stored faces
    const faces = await Face.find({ eventId });
    
    let nearestFace = null;
    let minDistance = 1.0;
    const DISTANCE_THRESHOLD = 0.4; // Strict threshold for Facenet512

    for (const face of faces) {
      if (!face.embedding || face.embedding.length === 0) continue;
      
      const dist = cosineDistance(embedding, face.embedding);
      if (dist < minDistance) {
        minDistance = dist;
        nearestFace = face;
      }
    }

    console.log(`[SEARCH-AI] Nearest neighbor distance: ${minDistance.toFixed(4)}`);

    let matchedPhotoIds = [];
    let matchedClusterId = null;

    if (nearestFace && minDistance <= DISTANCE_THRESHOLD) {
       console.log(`[SEARCH-AI] Confident match found! (Face ${nearestFace._id})`);
       matchedClusterId = nearestFace.personClusterId;
       const cluster = await PersonCluster.findById(matchedClusterId);
       if (cluster) {
         matchedPhotoIds = cluster.photoIds;
       }
    } else {
       console.log(`[SEARCH-AI] No confident match found (Min dist: ${minDistance.toFixed(4)} > ${DISTANCE_THRESHOLD})`);
    }

    // Fallback: If no match, return ONLY the selected photo
    if (matchedPhotoIds.length === 0) {
      matchedPhotoIds = [selectedPhotoId];
    }

    const photos = await Photo.find({ _id: { $in: matchedPhotoIds } }).sort({ qualityScore: -1 });

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
      minDistance // For debugging on client if needed
    });
  } catch (error) {
    console.error('[SEARCH-AI] Match Error:', error.message);
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
