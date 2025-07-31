const express = require('express');
const router = express.Router();
const { getStorageAdapter } = require('../storage/memoryAdapter');
const Zone = require('../models/Zone');

// Lấy tất cả zone của 1 camera
router.get('/camera/:cameraId', async (req, res) => {
  try {
    const adapter = getStorageAdapter();
    let zones;
    
    if (adapter.isInMemory) {
      zones = await adapter.storage.findZonesByCameraId(req.params.cameraId);
    } else {
      // const Zone = require('../models/Zone');
      zones = await Zone.find({ cameraId: req.params.cameraId });
    }
    
    res.json(zones);
  } catch (err) {
    console.error('Error fetching zones for camera:', err);
    res.status(500).json({ message: err.message });
  }
});

// Tạo zone mới
router.post('/', async (req, res) => {
  try {
    const adapter = getStorageAdapter();
    
    // Kiểm tra camera tồn tại
    let camera;
    if (adapter.isInMemory) {
      camera = await adapter.storage.findCameraById(req.body.cameraId);
    } else {
      const Camera = require('../models/Camera');
      camera = await Camera.findById(req.body.cameraId);
    }
    
    if (!camera) {
      return res.status(404).json({ message: 'Camera not found' });
    }

    const zoneData = {
      cameraId: req.body.cameraId,
      name: req.body.name,
      points: req.body.points,
      countingDirection: req.body.countingDirection || 'both'
    };

    let newZone;
    if (adapter.isInMemory) {
      newZone = await adapter.storage.createZone(zoneData);
    } else {
      // const Zone = require('../models/Zone');
      const zone = new Zone(zoneData);
      newZone = await zone.save();
    }
    
    res.status(201).json(newZone);
  } catch (err) {
    console.error('Error creating zone:', err);
    res.status(400).json({ message: err.message });
  }
});

// Cập nhật zone
router.patch('/:id', getZone, async (req, res) => {
  if (req.body.name != null) {
    res.zone.name = req.body.name;
  }
  if (req.body.points != null) {
    res.zone.points = req.body.points;
  }
  if (req.body.countingDirection != null) {
    res.zone.countingDirection = req.body.countingDirection;
  }

  try {
    const updatedZone = await res.zone.save();
    res.json(updatedZone);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// // Xóa zone
// router.delete('/:id', getZone, async (req, res) => {
//     console.log('Deleting zone');
//   try {
//     await res.zone.remove();
//     res.json({ message: 'Zone deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });
router.delete('/:id', getZone, async (_, res) => {
    console.log('Deleting zone');
  try {
    await res.zone.deleteOne();
    res.json({ message: 'Zone deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Middleware để lấy zone theo ID
async function getZone(req, res, next) {
  let zone;
  try {
    zone = await Zone.findById(req.params.id);
    if (zone == null) {
      return res.status(404).json({ message: 'Cannot find zone' });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.zone = zone;
  next();
}

module.exports = router;