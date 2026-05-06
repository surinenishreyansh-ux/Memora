const express = require('express');
const router = express.Router();
const { uploadEvent, searchFace, getClusterPhotos, processEvent, paymentSuccess } = require('../controllers/memoraController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Event photos upload and processing
router.post('/upload-event/:eventId', protect, upload.array('photos', 100), uploadEvent);
router.post('/process-event/:eventId', protect, processEvent);

// Guest face search
router.post('/search-face/:eventId', upload.single('faceCrop'), searchFace);

// Get photos by cluster ID
router.get('/cluster/:id', getClusterPhotos);

// Payment
router.post('/payment-success/:eventId', protect, paymentSuccess);

module.exports = router;
