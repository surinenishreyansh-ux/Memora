const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { processEvent, matchFace, getResults, deleteSearchData } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const matchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased limit for testing
  message: 'Too many match requests from this IP, please try again later.',
});

router.post('/process-event/:eventId', protect, processEvent);
router.post('/match-face/:eventId', matchLimiter, upload.single('faceCrop'), matchFace);
router.get('/results/:searchId', getResults);
router.delete('/search-data/:searchId', deleteSearchData);

module.exports = router;
