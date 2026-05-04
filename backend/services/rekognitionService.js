const { RekognitionClient, CreateCollectionCommand, DeleteCollectionCommand, IndexFacesCommand, SearchFacesByImageCommand } = require('@aws-sdk/client-rekognition');

let rekognitionClient;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== 'mock') {
  rekognitionClient = new RekognitionClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

const getCollectionName = (eventId) => {
  return `${process.env.REKOGNITION_COLLECTION_PREFIX || 'memora_event_'}${eventId}`;
};

const createCollection = async (eventId) => {
  if (process.env.MOCK_AI_MODE === 'true' || !rekognitionClient) {
    console.log(`[MOCK] Created collection for event ${eventId}`);
    return { CollectionArn: `mock-arn-${eventId}` };
  }

  const collectionId = getCollectionName(eventId);
  try {
    const command = new CreateCollectionCommand({ CollectionId: collectionId });
    return await rekognitionClient.send(command);
  } catch (error) {
    if (error.name === 'ResourceAlreadyExistsException') {
      console.log(`Collection ${collectionId} already exists.`);
      return { status: 'EXISTS' };
    }
    console.error(`Error creating collection ${collectionId}:`, error);
    throw error;
  }
};

const deleteCollection = async (eventId) => {
  if (process.env.MOCK_AI_MODE === 'true' || !rekognitionClient) {
    console.log(`[MOCK] Deleted collection for event ${eventId}`);
    return;
  }

  const collectionId = getCollectionName(eventId);
  try {
    const command = new DeleteCollectionCommand({ CollectionId: collectionId });
    await rekognitionClient.send(command);
  } catch (error) {
    console.error(`Error deleting collection ${collectionId}:`, error);
  }
};

const indexFaces = async (eventId, imageBuffer, photoId) => {
  if (process.env.MOCK_AI_MODE === 'true' || !rekognitionClient) {
    // We'll simulate deterministic identities based on the last digit of the photoId
    // To ensure variety, we use a simple modulo.
    const idStr = photoId.toString();
    const lastChar = idStr.charAt(idStr.length - 1);
    const charCode = lastChar.charCodeAt(0);
    
    // Pattern: Even char codes -> Person 0, Odd char codes -> Person 1
    const personId = charCode % 2;
    
    const faceRecords = [
      {
        Face: {
          FaceId: `mock-face-person-${personId}`,
          ExternalImageId: idStr,
          Confidence: 99,
          BoundingBox: { Width: 0.2, Height: 0.2, Left: 0.1, Top: 0.1 },
        },
      }
    ];

    console.log(`[MOCK] Photo ${idStr} (ends in ${lastChar}) -> Person ${personId}`);
    return { FaceRecords: faceRecords };
  }

  const command = new IndexFacesCommand({
    CollectionId: getCollectionName(eventId),
    Image: { Bytes: imageBuffer },
    ExternalImageId: photoId.toString(),
    DetectionAttributes: ['ALL'],
  });

  return await rekognitionClient.send(command);
};

const searchFaceByImage = async (eventId, cropBuffer) => {
  if (process.env.MOCK_AI_MODE === 'true' || !rekognitionClient) {
    // Determine which "mock person" to return based on eventId (for consistency)
    // and potentially based on the photo if we knew which one was selected.
    // In the controller, we can pass extra info or just return a generic match.
    
    // For this mock, we'll return Person 0 if eventId ends in '0' or '1', etc.
    // Actually, let's just return a match that we know exists in the system.
    return {
      FaceMatches: [
        {
          Similarity: 99,
          Face: {
            FaceId: 'mock-face-person-0', // Default mock match
          },
        },
      ],
    };
  }

  const command = new SearchFacesByImageCommand({
    CollectionId: getCollectionName(eventId),
    Image: { Bytes: cropBuffer },
    MaxFaces: 1,
    FaceMatchThreshold: 85, // Only confident matches
  });

  try {
    return await rekognitionClient.send(command);
  } catch (error) {
    console.error('SearchFaceByImage Error:', error);
    return { FaceMatches: [] };
  }
};

module.exports = {
  createCollection,
  deleteCollection,
  indexFaces,
  searchFaceByImage,
};
