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
    faceIndex: {
      type: Number,
    },
    personClusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PersonCluster',
    },
    boundingBox: {
      type: Object, // { x, y, w, h }
    },
    confidence: {
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

faceSchema.index({ eventId: 1 });
faceSchema.index({ personClusterId: 1 });

const Face = mongoose.model('Face', faceSchema);

module.exports = Face;
