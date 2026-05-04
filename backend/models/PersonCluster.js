const mongoose = require('mongoose');

const personClusterSchema = mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Event',
    },
    clusterName: {
      type: String,
    },
    faceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Face',
      },
    ],
    photoIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photo',
      },
    ],
    bestPhotoIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photo',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const PersonCluster = mongoose.model('PersonCluster', personClusterSchema);

module.exports = PersonCluster;
