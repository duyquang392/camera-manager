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
  // Config fields
  hlsUrl: {
    type: String,
    default: 'http://'
  },
  frameWidth: {
    type: Number,
    default: 1920
  },
  frameHeight: {
    type: Number,
    default: 1080
  },
  showRoi: {
    type: Boolean,
    default: true
  },
  showLine: {
    type: Boolean,
    default: true
  },
  showStats: {
    type: Boolean,
    default: true
  },
  resetInterval: {
    type: Number,
    default: 3600
  },
  resetTime: {
    type: String,
    default: '00:00'
  },
  enableAutoReset: {
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