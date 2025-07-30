require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files for HLS streams
app.use('/streams', express.static(path.join(__dirname, '../public/streams')));

// MongoDB connection with fallback
let mongoConnected = false;

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/traffic_roi', {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });
    console.log('✅ Connected to MongoDB');
    global.mongoConnected = true;
    mongoConnected = true;
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed, using in-memory storage:', err.message);
    global.mongoConnected = false;
    mongoConnected = false;
    
    // Setup in-memory storage fallback
    const { InMemoryStorage } = require('./storage/memoryAdapter');
    global.inMemoryStorage = new InMemoryStorage();
    console.log('✅ In-memory storage initialized');
  }
};

connectToMongoDB();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: global.mongoConnected ? 'mongodb' : 'in-memory',
    version: '1.0'
  });
});

// Routes
app.use('/api/cameras', require('./routes/cameraRoutes'));
app.use('/api/zones', require('./routes/zoneRoutes'));
app.use('/api/stream', require('./routes/streamRoutes'));
app.use('/api/config', require('./routes/configRoutes'));

const PORT = process.env.PORT || 5008;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${global.mongoConnected ? 'MongoDB' : 'In-Memory Storage'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

