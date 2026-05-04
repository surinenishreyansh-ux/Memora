const axios = require('axios');
const FormData = require('form-data');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

const processPhotosWithLocalAi = async (eventId, photos) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/process-photos`, {
      eventId,
      photos: photos.map(p => ({
        id: p._id,
        url: p.imageUrl
      }))
    });
    return response.data;
  } catch (error) {
    console.error('Error calling Python AI service:', error.message);
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
