const mongoose = require('mongoose');

const photoSchema = mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Event',
    },
    imageUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    qualityScore: {
      type: Number,
      default: 0,
    },
    sceneLabels: {
      type: [String],
    },
    processed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Photo = mongoose.model('Photo', photoSchema);

module.exports = Photo;
