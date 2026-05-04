const express = require('express');
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEventById,
  getEventBySlug,
  deleteEvent,
} = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createEvent).get(protect, getEvents);
router.get('/public/:slug', getEventBySlug);
router.route('/:eventId').get(protect, getEventById).delete(protect, deleteEvent);

module.exports = router;
