const Event = require('../models/Event');
const createSlug = require('../utils/createSlug');

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Studio)
const createEvent = async (req, res, next) => {
  try {
    const { name, date, coverImageUrl } = req.body;
    const publicSlug = createSlug(name);

    const event = await Event.create({
      studioId: req.user._id,
      name,
      date,
      coverImageUrl,
      publicSlug,
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all events for studio
// @route   GET /api/events
// @access  Private (Studio)
const getEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ studioId: req.user._id }).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event
// @route   GET /api/events/:eventId
// @access  Private (Studio)
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (event && event.studioId.toString() === req.user._id.toString()) {
      res.json(event);
    } else {
      res.status(404);
      throw new Error('Event not found or unauthorized');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get event by public slug (Guest facing)
// @route   GET /api/events/public/:slug
// @access  Public
const getEventBySlug = async (req, res, next) => {
  try {
    const event = await Event.findOne({ publicSlug: req.params.slug }).select('-studioId');
    if (event) {
      res.json(event);
    } else {
      res.status(404);
      throw new Error('Event not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:eventId
// @access  Private (Studio)
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (event && event.studioId.toString() === req.user._id.toString()) {
      const eventId = event._id;
      
      // Cascade delete related data
      const Photo = require('../models/Photo');
      const Face = require('../models/Face');
      const PersonCluster = require('../models/PersonCluster');
      
      await Promise.all([
        Photo.deleteMany({ eventId }),
        Face.deleteMany({ eventId }),
        PersonCluster.deleteMany({ eventId }),
        event.deleteOne()
      ]);

      console.log(`[EVENT] Deleted event ${eventId} and all related data.`);
      res.json({ message: 'Event and all related data removed' });
    } else {
      res.status(404);
      throw new Error('Event not found or unauthorized');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  getEventBySlug,
  deleteEvent,
};
