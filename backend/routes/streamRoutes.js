const express = require('express');
const router = express.Router();
const streamService = require('../streamService');
const Camera = require('../models/Camera');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const activeStreams = new Map();

// Bắt đầu stream cho camera (existing function - enhanced)
router.post('/:cameraId/start', async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.cameraId);
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    const hlsUrl = streamService.startStream(camera._id.toString(), camera.streamUrl);
    res.json({ hlsUrl });
  } catch (error) {
    console.error(`Error starting stream: ${error.message}`);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

// Start stream with custom URL (HLS/HTTP support)
router.post('/start', async (req, res) => {
  try {
    const { cameraId, sourceUrl, streamType = 'hls' } = req.body;

    if (!cameraId || !sourceUrl) {
      return res.status(400).json({ message: 'cameraId và sourceUrl là bắt buộc' });
    }

    // Check if stream already exists
    if (activeStreams.has(cameraId)) {
      const streamInfo = activeStreams.get(cameraId);
      return res.json({
        message: 'Stream đã tồn tại',
        streamUrl: streamInfo.streamUrl,
        cameraId
      });
    }

    const streamUrl = await startVideoStream(cameraId, sourceUrl, streamType);
    
    res.json({
      message: 'Stream đã được khởi tạo thành công',
      streamUrl,
      cameraId,
      sourceUrl,
      streamType
    });

  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ message: 'Lỗi khi khởi tạo stream', error: error.message });
  }
});

// Dừng stream (existing function)
router.post('/:cameraId/stop', (req, res) => {
  streamService.stopStream(req.params.cameraId);
  res.json({ message: 'Stream stopped' });
});

// Stop custom stream
router.post('/stop', (req, res) => {
  try {
    const { cameraId } = req.body;

    if (!cameraId) {
      return res.status(400).json({ message: 'cameraId là bắt buộc' });
    }

    stopVideoStream(cameraId);
    res.json({ message: 'Stream đã được dừng', cameraId });

  } catch (error) {
    console.error('Error stopping stream:', error);
    res.status(500).json({ message: 'Lỗi khi dừng stream', error: error.message });
  }
});

// Lấy danh sách stream đang hoạt động (existing function - enhanced)
router.get('/active', (req, res) => {
  try {
    const serviceStreams = streamService.getActiveStreams();
    const customStreams = Array.from(activeStreams.entries()).map(([cameraId, info]) => ({
      cameraId,
      streamUrl: info.streamUrl,
      sourceUrl: info.sourceUrl,
      startTime: info.startTime,
      uptime: Math.floor((Date.now() - info.startTime) / 1000),
      type: 'custom'
    }));

    const allStreams = [...serviceStreams.map(s => ({...s, type: 'service'})), ...customStreams];
    res.json({ streams: allStreams, count: allStreams.length });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách streams', error: error.message });
  }
});

// Get stream info
router.get('/:cameraId', (req, res) => {
  try {
    const { cameraId } = req.params;
    const streamInfo = activeStreams.get(cameraId);

    if (!streamInfo) {
      return res.status(404).json({ message: 'Stream không tồn tại' });
    }

    res.json({
      cameraId,
      streamUrl: streamInfo.streamUrl,
      sourceUrl: streamInfo.sourceUrl,
      startTime: streamInfo.startTime,
      uptime: Math.floor((Date.now() - streamInfo.startTime) / 1000)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy thông tin stream', error: error.message });
  }
});

// Helper functions
async function startVideoStream(cameraId, sourceUrl, streamType) {
  return new Promise((resolve, reject) => {
    try {
      // Create output directory
      const outputDir = path.join(__dirname, '../../public/streams', cameraId);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      let streamUrl, outputPath, ffmpegArgs;

      if (streamType === 'hls') {
        streamUrl = `/streams/${cameraId}/playlist.m3u8`;
        outputPath = path.join(outputDir, 'playlist.m3u8');

        // FFmpeg arguments for HLS
        ffmpegArgs = [
          '-i', sourceUrl,
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-crf', '23',
          '-maxrate', '2M',
          '-bufsize', '4M',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-f', 'hls',
          '-hls_time', '2',
          '-hls_list_size', '10',
          '-hls_flags', 'delete_segments+append_list',
          '-hls_allow_cache', '0',
          '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
          outputPath
        ];
      } else {
        // For HTTP streaming (MJPEG or similar)
        streamUrl = `/streams/${cameraId}/stream.mjpeg`;
        outputPath = path.join(outputDir, 'stream.mjpeg');

        ffmpegArgs = [
          '-i', sourceUrl,
          '-c:v', 'mjpeg',
          '-q:v', '3',
          '-r', '10',
          '-f', 'mjpeg',
          outputPath
        ];
      }

      console.log(`Starting FFmpeg for camera ${cameraId}: ffmpeg ${ffmpegArgs.join(' ')}`);

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      let isResolved = false;

      // Handle process events
      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`FFmpeg [${cameraId}]:`, output);

        // Check if stream is ready
        if (!isResolved && (output.includes('Opening') || output.includes('Stream mapping') || output.includes('Press [q] to stop'))) {
          isResolved = true;
          
          // Store stream info
          activeStreams.set(cameraId, {
            process: ffmpegProcess,
            streamUrl,
            sourceUrl,
            startTime: Date.now(),
            outputDir
          });

          resolve(streamUrl);
        }
      });

      ffmpegProcess.on('error', (err) => {
        console.error(`FFmpeg process error for camera ${cameraId}:`, err);
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
        cleanupStream(cameraId);
      });

      ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process for camera ${cameraId} exited with code ${code}`);
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
        cleanupStream(cameraId);
      });

      // Timeout fallback
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve(streamUrl); // Assume it's working
        }
      }, 5000);

    } catch (error) {
      reject(error);
    }
  });
}

function stopVideoStream(cameraId) {
  const streamInfo = activeStreams.get(cameraId);
  if (streamInfo) {
    try {
      streamInfo.process.kill('SIGTERM');
    } catch (error) {
      console.error(`Error killing process for camera ${cameraId}:`, error);
    }
    cleanupStream(cameraId);
  }
}

function cleanupStream(cameraId) {
  const streamInfo = activeStreams.get(cameraId);
  if (streamInfo) {
    // Clean up files
    try {
      if (fs.existsSync(streamInfo.outputDir)) {
        fs.rmSync(streamInfo.outputDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error(`Error cleaning up files for camera ${cameraId}:`, error);
    }
    
    activeStreams.delete(cameraId);
  }
}

// Cleanup on process exit
process.on('SIGINT', () => {
  console.log('Cleaning up streams...');
  for (const [cameraId] of activeStreams) {
    stopVideoStream(cameraId);
  }
  process.exit(0);
});

module.exports = router;