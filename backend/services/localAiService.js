const axios = require('axios');
const FormData = require('form-data');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

const processPhotosWithLocalAi = async (eventId, photos) => {
  try {
    console.log(`[AI-SERVICE-CALL] Calling ${PYTHON_SERVICE_URL}/process-photos`);
    const response = await axios.post(`${PYTHON_SERVICE_URL}/process-photos`, {
      eventId,
      photos: photos.map(p => ({
        id: p._id || p.id,
        url: p.imageUrl || p.url
      }))
    }, { timeout: 300000 }); // 5 minutes
    return response.data;
  } catch (error) {
    console.error(`[AI-SERVICE-CALL] Error: ${error.message} (URL: ${PYTHON_SERVICE_URL}/process-photos)`);
    throw new Error('AI Service Unavailable');
  }
};

const matchFaceWithLocalAi = async (eventId, faceCropBuffer) => {
  try {
    const form = new FormData();
    form.append('faceCrop', faceCropBuffer, {
      filename: 'crop.jpg',
      contentType: 'image/jpeg',
    });

    const response = await axios.post(`${PYTHON_SERVICE_URL}/match-face`, form, {
      headers: form.getHeaders(),
      timeout: 30000, // 30 seconds
    });

    return response.data; // returns { embedding: [...] }
  } catch (error) {
    console.error('Error calling Python AI match service:', error.message);
    throw new Error('AI Match Service Unavailable');
  }
};

module.exports = {
  processPhotosWithLocalAi,
  matchFaceWithLocalAi
};
