const mongoose = require('mongoose');

const faceSchema = mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Event',
    },
    photoId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Photo',
    },
    faceExternalId: {
      type: String,
    },
    personClusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PersonCluster',
    },
    boundingBox: {
      type: Object, // { Width, Height, Left, Top }
    },
    confidence: {
      type: Number,
    },
    qualityScore: {
      type: Number,
    },
    embedding: {
      type: [Number],
    },
  },
  {
    timestamps: true,
  }
);

const Face = mongoose.model('Face', faceSchema);

module.exports = Face;
