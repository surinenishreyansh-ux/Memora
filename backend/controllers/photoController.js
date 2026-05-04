const Photo = require('../models/Photo');
const Event = require('../models/Event');
const { uploadImageBuffer, deleteImage } = require('../services/cloudinaryService');
const { calculateQualityScore } = require('../services/qualityScoreService');

// @desc    Upload photos to event
// @route   POST /api/photos/upload/:eventId
// @access  Private (Studio)
const uploadPhotos = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event || event.studioId.toString() !== req.user._id.toString()) {
      res.status(404);
      throw new Error('Event not found or unauthorized');
    }

    if (!req.files || req.files.length === 0) {
      res.status(400);
      throw new Error('No files uploaded');
    }

    const uploadedPhotos = [];

    for (const file of req.files) {
      // 1. Upload to Cloudinary
      const result = await uploadImageBuffer(file.buffer, `memora/events/${event._id}`);
      
      // 2. Calculate initial quality score
      const qualityScore = await calculateQualityScore(file.buffer);

      // 3. Save to DB
      const photo = await Photo.create({
        eventId: event._id,
        imageUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        originalName: file.originalname,
        width: result.width,
        height: result.height,
        qualityScore,
      });

      uploadedPhotos.push(photo);
    }

    res.status(201).json(uploadedPhotos);
  } catch (error) {
    next(error);
  }
};

// @desc    Get photos for event
// @route   GET /api/photos/:eventId
// @access  Public
const getPhotosByEvent = async (req, res, next) => {
  try {
    const photos = await Photo.find({ eventId: req.params.eventId }).sort({ createdAt: -1 });
    res.json(photos);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete photo
// @route   DELETE /api/photos/:photoId
// @access  Private (Studio)
const deletePhoto = async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.photoId).populate('eventId');
    
    if (!photo || photo.eventId.studioId.toString() !== req.user._id.toString()) {
      res.status(404);
      throw new Error('Photo not found or unauthorized');
    }

    // Delete from Cloudinary
    await deleteImage(photo.cloudinaryPublicId);
    
    // Delete from DB
    await photo.deleteOne();
    
    res.json({ message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPhotos,
  getPhotosByEvent,
  deletePhoto,
};
