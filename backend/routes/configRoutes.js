const express = require('express');
const router = express.Router();
const { getStorageAdapter } = require('../storage/memoryAdapter');

// Import models for MongoDB case
const Camera = require('../models/Camera');
const Zone = require('../models/Zone');

// Export full configuration as JSON
router.get('/export', async (req, res) => {
  try {
    const { cameraId, format = 'json' } = req.query;

    let cameras, zones;

    if (cameraId) {
      // Export specific camera configuration
      cameras = await Camera.findById(cameraId);
      if (!cameras) {
        return res.status(404).json({ message: 'Camera không tồn tại' });
      }
      cameras = [cameras];
      zones = await Zone.find({ cameraId });
    } else {
      // Export all cameras and zones
      cameras = await Camera.find();
      zones = await Zone.find();
    }

    // Group zones by camera
    const zonesByCamera = zones.reduce((acc, zone) => {
      const cameraId = zone.cameraId.toString();
      if (!acc[cameraId]) {
        acc[cameraId] = [];
      }
      acc[cameraId].push({
        id: zone._id,
        name: zone.name,
        points: zone.points,
        countingDirection: zone.countingDirection,
        createdAt: zone.createdAt
      });
      return acc;
    }, {});

    // Build configuration object
    const config = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        exportType: cameraId ? 'single_camera' : 'full_system',
        cameraCount: cameras.length,
        totalZones: zones.length
      },
      cameras: cameras.map(camera => ({
        id: camera._id,
        name: camera.name,
        streamUrl: camera.streamUrl,
        description: camera.description,
        createdAt: camera.createdAt,
        zones: zonesByCamera[camera._id.toString()] || []
      }))
    };

    if (format === 'download') {
      // Set headers for file download
      const filename = cameraId ? 
        `camera_${cameraId}_config_${Date.now()}.json` : 
        `traffic_roi_config_${Date.now()}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.json(config);

  } catch (error) {
    console.error('Error exporting configuration:', error);
    res.status(500).json({ 
      message: 'Lỗi khi xuất cấu hình', 
      error: error.message 
    });
  }
});

// Export configuration for specific camera
router.get('/export/camera/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { format = 'json' } = req.query;

    const camera = await Camera.findById(cameraId);
    if (!camera) {
      return res.status(404).json({ message: 'Camera không tồn tại' });
    }

    const zones = await Zone.find({ cameraId });

    const config = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        exportType: 'single_camera',
        cameraId
      },
      camera: {
        id: camera._id,
        name: camera.name,
        streamUrl: camera.streamUrl,
        description: camera.description,
        createdAt: camera.createdAt
      },
      zones: zones.map(zone => ({
        id: zone._id,
        name: zone.name,
        points: zone.points,
        countingDirection: zone.countingDirection,
        createdAt: zone.createdAt
      }))
    };

    if (format === 'download') {
      const filename = `camera_${camera.name.replace(/\s+/g, '_')}_config_${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.json(config);

  } catch (error) {
    console.error('Error exporting camera configuration:', error);
    res.status(500).json({ 
      message: 'Lỗi khi xuất cấu hình camera', 
      error: error.message 
    });
  }
});

// Import configuration
router.post('/import', async (req, res) => {
  try {
    const { config, replaceExisting = false } = req.body;

    if (!config || !config.cameras) {
      return res.status(400).json({ message: 'Dữ liệu cấu hình không hợp lệ' });
    }

    const results = {
      imported: {
        cameras: 0,
        zones: 0
      },
      skipped: {
        cameras: 0,
        zones: 0
      },
      errors: []
    };

    for (const cameraConfig of config.cameras) {
      try {
        let camera;
        
        if (replaceExisting) {
          // Update existing or create new
          camera = await Camera.findOneAndUpdate(
            { name: cameraConfig.name },
            {
              name: cameraConfig.name,
              streamUrl: cameraConfig.streamUrl,
              description: cameraConfig.description
            },
            { upsert: true, new: true }
          );
        } else {
          // Only create if doesn't exist
          const existingCamera = await Camera.findOne({ name: cameraConfig.name });
          if (existingCamera) {
            results.skipped.cameras++;
            continue;
          }
          
          camera = new Camera({
            name: cameraConfig.name,
            streamUrl: cameraConfig.streamUrl,
            description: cameraConfig.description
          });
          await camera.save();
        }

        results.imported.cameras++;

        // Import zones for this camera
        if (cameraConfig.zones && cameraConfig.zones.length > 0) {
          if (replaceExisting) {
            // Remove existing zones for this camera
            await Zone.deleteMany({ cameraId: camera._id });
          }

          for (const zoneConfig of cameraConfig.zones) {
            try {
              const existingZone = await Zone.findOne({ 
                cameraId: camera._id, 
                name: zoneConfig.name 
              });

              if (!existingZone || replaceExisting) {
                if (existingZone && replaceExisting) {
                  await Zone.findByIdAndDelete(existingZone._id);
                }

                const zone = new Zone({
                  cameraId: camera._id,
                  name: zoneConfig.name,
                  points: zoneConfig.points,
                  countingDirection: zoneConfig.countingDirection || 'both'
                });
                await zone.save();
                results.imported.zones++;
              } else {
                results.skipped.zones++;
              }
            } catch (zoneError) {
              results.errors.push(`Zone "${zoneConfig.name}": ${zoneError.message}`);
            }
          }
        }

      } catch (cameraError) {
        results.errors.push(`Camera "${cameraConfig.name}": ${cameraError.message}`);
      }
    }

    res.json({
      message: 'Import hoàn thành',
      results
    });

  } catch (error) {
    console.error('Error importing configuration:', error);
    res.status(500).json({ 
      message: 'Lỗi khi import cấu hình', 
      error: error.message 
    });
  }
});

// Get configuration by camera name (for external devices)
router.get('/camera/name/:cameraName', async (req, res) => {
  try {
    const { cameraName } = req.params;
    const { format = 'json' } = req.query;
    const adapter = getStorageAdapter();

    let camera;
    if (adapter.isInMemory) {
      camera = await adapter.storage.findCameraByName(cameraName);
    } else {
      const Camera = require('../models/Camera');
      camera = await Camera.findOne({ name: cameraName });
    }

    if (!camera) {
      return res.status(404).json({ 
        message: `Camera với tên "${cameraName}" không tồn tại` 
      });
    }

    let zones;
    if (adapter.isInMemory) {
      zones = await adapter.storage.findZonesByCameraId(camera._id);
    } else {
      const Zone = require('../models/Zone');
      zones = await Zone.find({ cameraId: camera._id });
    }

    const config = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        exportType: 'camera_by_name',
        requestedName: cameraName
      },
      camera: {
        id: camera._id,
        name: camera.name,
        streamUrl: camera.streamUrl,
        streamType: camera.streamType,
        description: camera.description,
        createdAt: camera.createdAt,
        isActive: camera.isActive
      },
      zones: zones.map(zone => ({
        id: zone._id,
        name: zone.name,
        points: zone.points,
        countingDirection: zone.countingDirection,
        createdAt: zone.createdAt
      }))
    };

    if (format === 'download') {
      const filename = `camera_${cameraName.replace(/\s+/g, '_')}_config_${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.json(config);

  } catch (error) {
    console.error('Error getting camera config by name:', error);
    res.status(500).json({ 
      message: 'Lỗi khi lấy cấu hình camera theo tên', 
      error: error.message 
    });
  }
});

// List all camera names and IDs (for external device discovery)
router.get('/cameras/list', async (req, res) => {
  try {
    const adapter = getStorageAdapter();
    let cameras;
    
    if (adapter.isInMemory) {
      cameras = await adapter.storage.findAllCameras();
    } else {
      const Camera = require('../models/Camera');
      cameras = await Camera.find({}, 'name _id streamType isActive createdAt').sort({ name: 1 });
    }
    
    res.json({
      totalCameras: cameras.length,
      cameras: cameras.map(camera => ({
        id: camera._id,
        name: camera.name,
        streamType: camera.streamType,
        isActive: camera.isActive,
        createdAt: camera.createdAt
      }))
    });

  } catch (error) {
    console.error('Error listing cameras:', error);
    res.status(500).json({ 
      message: 'Lỗi khi lấy danh sách camera', 
      error: error.message 
    });
  }
});

// Ping endpoint for external devices to check API availability
router.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0',
    message: 'Traffic AI Config API is running'
  });
});
router.get('/stats', async (req, res) => {
  try {
    const adapter = getStorageAdapter();
    const cameraCount = await Camera.countDocuments();
    const zoneCount = await Zone.countDocuments();
    
    // Zones by camera
    const zonesByCamera = await Zone.aggregate([
      {
        $group: {
          _id: '$cameraId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'cameras',
          localField: '_id',
          foreignField: '_id',
          as: 'camera'
        }
      },
      {
        $unwind: '$camera'
      },
      {
        $project: {
          cameraId: '$_id',
          cameraName: '$camera.name',
          zoneCount: '$count'
        }
      }
    ]);

    // Zones by counting direction
    const zonesByDirection = await Zone.aggregate([
      {
        $group: {
          _id: '$countingDirection',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      system: {
        totalCameras: cameraCount,
        totalZones: zoneCount,
        averageZonesPerCamera: cameraCount > 0 ? (zoneCount / cameraCount).toFixed(2) : 0
      },
      cameras: zonesByCamera,
      zoneDistribution: zonesByDirection.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ 
      message: 'Lỗi khi lấy thống kê', 
      error: error.message 
    });
  }
});

module.exports = router;
