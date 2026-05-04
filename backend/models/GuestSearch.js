const mongoose = require('mongoose');

const guestSearchSchema = mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Event',
    },
    selectedPhotoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Photo',
    },
    cropImageUrl: {
      type: String, // Or cloudinary path if saved
    },
    matchedClusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PersonCluster',
    },
    matchedPhotoIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photo',
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

guestSearchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const GuestSearch = mongoose.model('GuestSearch', guestSearchSchema);

module.exports = GuestSearch;
