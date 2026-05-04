const Face = require('../models/Face');
const PersonCluster = require('../models/PersonCluster');

/**
 * Groups faces into clusters based on Face identity.
 * A Face identity is identified by faceExternalId (AWS FaceId).
 * This allows a single photo to belong to multiple clusters if it contains multiple faces.
 */
const groupFacesIntoClusters = async (eventId) => {
  // 1. Get all faces for the event
  const faces = await Face.find({ eventId }).populate('photoId');
  
  console.log(`[AI-DEBUG] Starting clustering for event ${eventId}`);
  console.log(`[AI-DEBUG] Total faces detected: ${faces.length}`);

  // 2. Group faces by identity
  const identityMap = new Map(); // FaceId -> { faceIds, photoIds }

  faces.forEach(face => {
    const identity = face.faceExternalId || `unidentified-${face._id}`;
    
    if (!identityMap.has(identity)) {
      identityMap.set(identity, {
        faceIds: [],
        photoIds: new Set()
      });
    }

    const group = identityMap.get(identity);
    group.faceIds.push(face._id);
    if (face.photoId) {
      group.photoIds.add(face.photoId._id.toString());
    }
  });

  console.log(`[AI-DEBUG] Unique identities (clusters) found: ${identityMap.size}`);

  // 3. Clear existing clusters and update
  await PersonCluster.deleteMany({ eventId });

  for (const [identity, data] of identityMap.entries()) {
    const photoIdsArr = Array.from(data.photoIds);
    
    // Only create cluster if it spans multiple photos OR has high confidence
    // For MVP, we create clusters for all unique identities
    const cluster = await PersonCluster.create({
      eventId,
      clusterName: `Identity-${identity.slice(-6)}`,
      faceIds: data.faceIds,
      photoIds: photoIdsArr,
      bestPhotoIds: photoIdsArr.slice(0, 5),
    });

    // 4. Link faces back to the cluster
    await Face.updateMany(
      { _id: { $in: data.faceIds } },
      { $set: { personClusterId: cluster._id } }
    );

    console.log(`[AI-DEBUG] Cluster ${cluster.clusterName}: ${data.faceIds.length} faces in ${photoIdsArr.length} photos`);
    console.log(`[AI-DEBUG] Photo IDs in cluster: ${photoIdsArr.join(', ')}`);
  }

  console.log(`[AI-DEBUG] Clustering complete for event ${eventId}`);
};

module.exports = { groupFacesIntoClusters };
