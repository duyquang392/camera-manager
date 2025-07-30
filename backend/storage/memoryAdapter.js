// In-memory storage adapter
class InMemoryStorage {
  constructor() {
    this.cameras = [];
    this.zones = [];
    this.nextCameraId = 1;
    this.nextZoneId = 1;
  }

  // Camera methods
  async findAllCameras() {
    return [...this.cameras];
  }

  async findCameraById(id) {
    return this.cameras.find(c => c._id === id);
  }

  async findCameraByName(name) {
    return this.cameras.find(c => c.name === name);
  }

  async createCamera(cameraData) {
    // Check for duplicate name
    if (this.cameras.some(c => c.name === cameraData.name)) {
      throw new Error('Camera name already exists');
    }

    const camera = {
      _id: `camera_${this.nextCameraId++}`,
      ...cameraData,
      isActive: cameraData.isActive !== undefined ? cameraData.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.cameras.push(camera);
    return camera;
  }

  async updateCamera(id, updateData) {
    const index = this.cameras.findIndex(c => c._id === id);
    if (index === -1) return null;

    // Check for duplicate name if name is being updated
    if (updateData.name && this.cameras.some(c => c.name === updateData.name && c._id !== id)) {
      throw new Error('Camera name already exists');
    }

    this.cameras[index] = {
      ...this.cameras[index],
      ...updateData,
      updatedAt: new Date()
    };

    return this.cameras[index];
  }

  async deleteCamera(id) {
    const index = this.cameras.findIndex(c => c._id === id);
    if (index === -1) return false;

    // Also delete associated zones
    this.zones = this.zones.filter(z => z.cameraId !== id);
    this.cameras.splice(index, 1);
    return true;
  }

  // Zone methods
  async findZonesByCameraId(cameraId) {
    return this.zones.filter(z => z.cameraId === cameraId);
  }

  async findZoneById(id) {
    return this.zones.find(z => z._id === id);
  }

  async createZone(zoneData) {
    const zone = {
      _id: `zone_${this.nextZoneId++}`,
      ...zoneData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.zones.push(zone);
    return zone;
  }

  async updateZone(id, updateData) {
    const index = this.zones.findIndex(z => z._id === id);
    if (index === -1) return null;

    this.zones[index] = {
      ...this.zones[index],
      ...updateData,
      updatedAt: new Date()
    };

    return this.zones[index];
  }

  async deleteZone(id) {
    const index = this.zones.findIndex(z => z._id === id);
    if (index === -1) return false;

    this.zones.splice(index, 1);
    return true;
  }

  async countCameras() {
    return this.cameras.length;
  }

  async countZones() {
    return this.zones.length;
  }
}

// Create storage adapter based on MongoDB connection status
function getStorageAdapter() {
  if (global.mongoConnected) {
    // Use MongoDB models
    const Camera = require('../models/Camera');
    const Zone = require('../models/Zone');
    return { Camera, Zone, isInMemory: false };
  } else {
    // Use in-memory storage
    if (!global.inMemoryStorage) {
      global.inMemoryStorage = new InMemoryStorage();
    }
    return { 
      storage: global.inMemoryStorage, 
      isInMemory: true 
    };
  }
}

module.exports = { InMemoryStorage, getStorageAdapter };