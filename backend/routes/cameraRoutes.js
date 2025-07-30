const express = require('express');
const router = express.Router();
const { getStorageAdapter } = require('../storage/memoryAdapter');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { spawn } = require('child_process');

function killGo2rtc() {
  return new Promise((resolve, reject) => {
    const proc = spawn('pkill', ['-f', 'go2rtc']);
    proc.on('close', (code, signal) => {
      console.log(`pkill exited with code=${code}, signal=${signal}`);
      resolve(); // không reject
    });
    proc.on('error', (err) => {
      console.warn('Error when spawning pkill:', err);
      resolve(); // vẫn resolve để không throw
    });
  });
}


function execSafe(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(`[execSafe] Command failed: ${cmd}`);
        console.warn(`[execSafe] error:`, error);
        return resolve(); // Không throw, chỉ log
      }
      resolve();
    });
  });
}

// Gọi như sau:
// await execSafe('pkill -f "go2rtc" || true');


// Lấy tất cả camera
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all cameras');
    const adapter = getStorageAdapter();
    
    let cameras;
    if (adapter.isInMemory) {
      cameras = await adapter.storage.findAllCameras();
    } else {
      cameras = await adapter.Camera.find();
    }
    
    res.json(cameras);
  } catch (err) {
    console.error('Error fetching cameras:', err);
    res.status(500).json({ message: err.message });
  }
});

// Tạo camera mới
router.post('/', async (req, res) => {
  console.log('Creating new camera:', req.body);
  try {
    const adapter = getStorageAdapter();
    const cameraData = {
      name: req.body.name,
      streamUrl: req.body.streamUrl,
      streamType: req.body.streamType || 'rtsp',
      description: req.body.description
    };

    let newCamera;
    if (adapter.isInMemory) {
      newCamera = await adapter.storage.createCamera(cameraData);
    } else {
      const camera = new adapter.Camera(cameraData);
      newCamera = await camera.save();
    }
    
    res.status(201).json(newCamera);
  } catch (err) {
    console.error('Error creating camera:', err);
    if (err.message.includes('already exists') || err.code === 11000) {
      res.status(400).json({ message: 'Tên camera đã tồn tại' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Lấy thông tin 1 camera
router.get('/:id', getCamera, (req, res) => {
  res.json(res.camera);
});

// Cập nhật camera
router.patch('/:id', getCamera, async (req, res) => {
  try {
    const adapter = getStorageAdapter();
    const updateData = {};
    
    if (req.body.name != null) updateData.name = req.body.name;
    if (req.body.streamUrl != null) updateData.streamUrl = req.body.streamUrl;
    if (req.body.streamType != null) updateData.streamType = req.body.streamType;
    if (req.body.description != null) updateData.description = req.body.description;
    if (req.body.isActive != null) updateData.isActive = req.body.isActive;

    let updatedCamera;
    if (adapter.isInMemory) {
      updatedCamera = await adapter.storage.updateCamera(res.camera._id, updateData);
    } else {
      Object.assign(res.camera, updateData);
      updatedCamera = await res.camera.save();
    }
    
    res.json(updatedCamera);
  } catch (err) {
    console.error('Error updating camera:', err);
    if (err.message.includes('already exists') || err.code === 11000) {
      res.status(400).json({ message: 'Tên camera đã tồn tại' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Xóa camera
router.delete('/:id', getCamera, async (req, res) => {
  try {
    const adapter = getStorageAdapter();
    
    if (adapter.isInMemory) {
      // Sử dụng storage adapter để xóa
      await adapter.storage.deleteCamera(res.camera._id);
    } else {
      // Kiểm tra nếu có method remove (Mongoose)
      if (typeof res.camera.remove === 'function') {
        await res.camera.remove();
      } else if (typeof res.camera.deleteOne === 'function') {
        await res.camera.deleteOne();
      } else {
        // Fallback: sử dụng Model.findByIdAndDelete
        await adapter.Camera.findByIdAndDelete(res.camera._id);
      }
    }
    
    res.json({ message: 'Camera deleted' });
  } catch (err) {
    console.error('Error deleting camera:', err);
    res.status(500).json({ message: err.message });
  }
});


// Middleware để lấy camera theo ID
async function getCamera(req, res, next) {
  let camera;
  try {
    const adapter = getStorageAdapter();
    
    if (adapter.isInMemory) {
      camera = await adapter.storage.findCameraById(req.params.id);
    } else {
      camera = await adapter.Camera.findById(req.params.id);
    }
    
    if (camera == null) {
      return res.status(404).json({ message: 'Cannot find camera' });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.camera = camera;
  next();
}

module.exports = router;