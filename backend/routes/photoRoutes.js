const express = require('express');
const router = express.Router();
const { uploadPhotos, getPhotosByEvent, deletePhoto } = require('../controllers/photoController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload/:eventId', protect, upload.array('photos', 50), uploadPhotos);
router.get('/:eventId', getPhotosByEvent);
router.delete('/:photoId', protect, deletePhoto);

module.exports = router;
