const mongoose = require('mongoose');

const CameraSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  streamUrl: {
    type: String,
    required: true
  },
  streamType: {
    type: String,
    enum: ['rtsp', 'http', 'hls', 'mjpeg'],
    default: 'rtsp'
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  hlsStreamUrl: {
    type: String // Generated HLS URL when streaming is active
  },
  lastStreamStart: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
CameraSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Camera', CameraSchema);