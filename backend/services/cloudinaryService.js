const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const fs = require('fs');
const path = require('path');

const uploadImageBuffer = (buffer, folder = 'memora') => {
  return new Promise((resolve, reject) => {
    if (process.env.CLOUDINARY_CLOUD_NAME === 'mock_cloud' || !process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('[MOCK] Cloudinary upload skipped. Saving to local uploads folder.');
      
      const fileName = `mock_image_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
      const filePath = path.join(__dirname, '..', 'uploads', fileName);
      
      fs.writeFileSync(filePath, buffer);

      return resolve({
        secure_url: `http://localhost:5000/uploads/${fileName}`,
        public_id: fileName,
        width: 800,
        height: 600
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

module.exports = { uploadImageBuffer, deleteImage };
