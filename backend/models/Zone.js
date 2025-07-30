const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
  cameraId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camera',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  points: [{
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  }],
  countingDirection: {
    type: String,
    enum: ['in', 'out', 'both'],
    default: 'both'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Zone', ZoneSchema);