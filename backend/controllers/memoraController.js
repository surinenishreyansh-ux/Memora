const axios = require('axios');
const Photo = require('../models/Photo');
const Face = require('../models/Face');
const PersonCluster = require('../models/PersonCluster');
const Event = require('../models/Event');
const { uploadImageBuffer } = require('../services/cloudinaryService');
const { processPhotosWithLocalAi, matchFaceWithLocalAi } = require('../services/localAiService');

/**
 * Utility: Cosine Similarity between two normalized vectors
 */
const euclideanDistance = (vecA, vecB) => {
    return Math.sqrt(vecA.reduce((sum, a, i) => sum + Math.pow(a - vecB[i], 2), 0));
};

// @desc    Upload multiple photos and trigger AI clustering
// @route   POST /api/memora/upload-event/:eventId
const uploadEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No photos uploaded' });
    }

    const uploadedPhotos = [];

    // 1. Upload all photos to Cloudinary/DB
    for (const file of req.files) {
      const result = await uploadImageBuffer(file.buffer, `memora/events/${eventId}`);
      
      const photo = await Photo.create({
        eventId,
        imageUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        originalName: file.originalname,
        width: result.width,
        height: result.height,
        processed: false
      });
      uploadedPhotos.push(photo);
    }

    // 2. Trigger AI processing in background
    (async () => {
      try {
        console.log(`[MEMORA-AI] Processing ${uploadedPhotos.length} new photos for event ${eventId}`);
        
        // Prepare new photos for Python service
        const photosForAi = uploadedPhotos.map(p => ({
          id: p._id,
          url: p.imageUrl
        }));

        // Get new faces from AI service
        const aiData = await processPhotosWithLocalAi(eventId, photosForAi);
        
        // 3. Fetch EXISTING faces for this event to avoid recomputing
        const existingFaces = await Face.find({ eventId });
        
        // Combine new faces with existing ones for global clustering
        const allFacesForClustering = [
          ...existingFaces.map(f => ({
            id: f._id.toString(),
            photoId: f.photoId.toString(),
            embedding: f.embedding,
            isNew: false
          })),
          ...aiData.faces.map(f => ({
            id: f.id, // Temporary internal ID from Python
            photoId: f.photoId,
            embedding: f.embedding,
            isNew: true,
            faceData: f // Keep original data to create record later
          }))
        ];

        console.log(`[MEMORA-AI] Total faces for global clustering: ${allFacesForClustering.length}`);

        // 4. Create NEW Face records first so they have MongoIDs
        const internalIdToMongoId = {};
        for (const face of allFacesForClustering) {
          if (face.isNew) {
            const fData = face.faceData;
            const newFace = await Face.create({
              eventId,
              photoId: fData.photoId,
              faceIndex: fData.faceIndex,
              boundingBox: fData.boundingBox,
              confidence: fData.confidence,
              embedding: fData.embedding
            });
            internalIdToMongoId[face.id] = newFace._id;
            face.mongoId = newFace._id;
          } else {
            face.mongoId = face.id;
          }
        }

        // 5. Send ALL embeddings back to Python for global clustering
        const { data: clusterResponse } = await axios.post(`${process.env.PYTHON_SERVICE_URL}/cluster-only`, {
          faces: allFacesForClustering.map(f => ({
            id: f.mongoId.toString(),
            photoId: f.photoId.toString(),
            embedding: f.embedding
          })),
          threshold: parseFloat(process.env.FACE_MATCH_TOLERANCE || '0.55')
        });

        // 6. Delete OLD clusters for this event and replace with new ones
        await PersonCluster.deleteMany({ eventId });
        
        for (const clusterData of clusterResponse.clusters) {
          const newCluster = await PersonCluster.create({
            eventId,
            clusterId: clusterData.clusterId,
            faceIds: clusterData.faceIds,
            photoIds: clusterData.photoIds
          });

          // Update Face records with the new personClusterId
          await Face.updateMany(
            { _id: { $in: clusterData.faceIds } },
            { personClusterId: newCluster._id }
          );
        }

        // 7. Mark photos as processed
        await Photo.updateMany(
          { _id: { $in: uploadedPhotos.map(p => p._id) } },
          { processed: true }
        );

        console.log(`[MEMORA-AI] Global clustering complete for event ${eventId}. Total People: ${clusterResponse.clusters.length}`);
      } catch (err) {
        console.error('[MEMORA-AI] Processing error:', err.message);
      }
    })();

    res.status(201).json({
      message: 'Photos uploaded and processing started',
      count: uploadedPhotos.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process existing photos for an event
// @route   POST /api/memora/process-event/:eventId
const processEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const photos = await Photo.find({ eventId });
    if (photos.length === 0) {
      return res.status(400).json({ message: 'No photos to process' });
    }

    // Run in background
    (async () => {
      try {
        console.log(`[MEMORA-AI] Manually triggering processing for ${photos.length} photos`);
        
        const photosForAi = photos.map(p => ({
          id: p._id,
          url: p.imageUrl
        }));

        const aiData = await processPhotosWithLocalAi(eventId, photosForAi);
        
        // Fetch all existing faces (if any)
        const existingFaces = await Face.find({ eventId });
        
        // For manual re-process, we might want to clear old faces or merge.
        // Let's clear and re-create to keep it clean.
        await Face.deleteMany({ eventId });
        await PersonCluster.deleteMany({ eventId });

        const internalIdToMongoId = {};
        for (const faceData of aiData.faces) {
          const face = await Face.create({
            eventId,
            photoId: faceData.photoId,
            faceIndex: faceData.faceIndex,
            boundingBox: faceData.boundingBox,
            confidence: faceData.confidence,
            embedding: faceData.embedding
          });
          internalIdToMongoId[faceData.id] = face._id;
        }

        const { data: clusterResponse } = await axios.post(`${process.env.PYTHON_SERVICE_URL}/cluster-only`, {
          faces: aiData.faces.map(f => ({
            id: internalIdToMongoId[f.id].toString(),
            photoId: f.photoId.toString(),
            embedding: f.embedding
          })),
          threshold: parseFloat(process.env.FACE_MATCH_TOLERANCE || '0.55')
        });

        for (const clusterData of clusterResponse.clusters) {
          const newCluster = await PersonCluster.create({
            eventId,
            clusterId: clusterData.clusterId,
            faceIds: clusterData.faceIds,
            photoIds: clusterData.photoIds
          });

          await Face.updateMany(
            { _id: { $in: clusterData.faceIds } },
            { personClusterId: newCluster._id }
          );
        }

        await Photo.updateMany({ eventId }, { processed: true });
        
        event.processingStatus = 'completed';
        await event.save();

        console.log(`[MEMORA-AI] Manual processing complete for ${eventId}`);
      } catch (err) {
        console.error('[MEMORA-AI] Manual processing error:', err.message);
        event.processingStatus = 'failed';
        await event.save();
      }
    })();

    event.processingStatus = 'processing';
    await event.save();
    
    res.json({ message: 'AI processing started' });
  } catch (error) {
    next(error);
  }
};

// @desc    Search for matching photos using a face crop
// @route   POST /api/memora/search-face/:eventId
const searchFace = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const faceCropFile = req.file;

    if (!faceCropFile) {
      return res.status(400).json({ message: 'No face crop provided' });
    }

    // 1. Get embedding and metadata from Python AI
    let aiResponse;
    try {
      aiResponse = await matchFaceWithLocalAi(eventId, faceCropFile.buffer);
    } catch (err) {
      return res.status(503).json({ message: 'AI service unavailable. Please try again later.' });
    }

    const { embedding, faceDetected, multipleFaces } = aiResponse;

    if (!faceDetected) {
      return res.status(400).json({ 
        matched: false, 
        message: 'No face detected in the uploaded image. Please try a clearer photo.' 
      });
    }

    if (multipleFaces) {
      return res.status(400).json({ 
        matched: false, 
        message: 'Multiple faces detected. Please upload a photo with only one person or crop more tightly.' 
      });
    }

    // 2. Nearest Neighbor Search among stored faces for this event
    const faces = await Face.find({ eventId, personClusterId: { $exists: true } });
    
    let bestMatch = null;
    let minDistance = Infinity;
    const tolerance = parseFloat(process.env.FACE_MATCH_TOLERANCE || '0.55');

    for (const face of faces) {
      if (!face.embedding || face.embedding.length === 0) continue;
      
      const distance = euclideanDistance(embedding, face.embedding);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = face;
      }
    }

    console.log(`[MEMORA-AI] Best match distance: ${minDistance.toFixed(4)} (Tolerance: ${tolerance})`);

    if (!bestMatch || minDistance > tolerance) {
      return res.json({
        matched: false,
        message: 'No strong face match found'
      });
    }

    // 3. Retrieve all photos for the matched person's cluster
    const cluster = await PersonCluster.findById(bestMatch.personClusterId).populate('photoIds');

    if (!cluster) {
        return res.status(404).json({
            matched: false,
            message: "Matched cluster no longer exists."
        });
    }

    res.json({
      matched: true,
      clusterId: cluster.clusterId,
      photos: cluster.photoIds.map(p => p.imageUrl)
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Mock payment success and update event status
// @route   POST /api/memora/payment-success/:eventId
const paymentSuccess = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { planType, price } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.paymentStatus = 'paid';
    event.planType = planType;
    await event.save();

    res.json({ message: 'Payment recorded successfully', event });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all photos of a person by cluster ID
// @route   GET /api/memora/cluster/:id
const getClusterPhotos = async (req, res, next) => {
  try {
    const cluster = await PersonCluster.findById(req.params.id).populate('photoIds');
    
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    res.json({
      clusterId: cluster.clusterId,
      photos: cluster.photoIds.map(p => p.imageUrl)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadEvent,
  processEvent,
  searchFace,
  getClusterPhotos,
  paymentSuccess
};
