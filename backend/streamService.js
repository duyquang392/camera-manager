const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
// const // logger = require('../utils/// logger');

const streams = {};

function startStream(cameraId, rtspUrl) {
  // Kiểm tra nếu stream đã tồn tại
  if (streams[cameraId]) {
    // // logger.info(`Stream for camera ${cameraId} already exists`);
    return streams[cameraId].hlsUrl;
  }

  // Tạo thư mục output
  const outputDir = path.join(__dirname, '../../public/streams', cameraId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const hlsUrl = `/streams/${cameraId}/stream.m3u8`;
  const outputPath = path.join(outputDir, 'stream.m3u8');

  // FFmpeg command với các tham số tối ưu
  const ffmpegArgs = [
    '-i', rtspUrl,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', 'hls',
    '-hls_time', '2',          // Độ dài mỗi segment (giây)
    '-hls_list_size', '5',     // Số segment giữ trong playlist
    '-hls_flags', 'delete_segments',
    '-hls_allow_cache', '0',
    '-strftime', '1',
    '-hls_segment_filename', path.join(outputDir, '%Y%m%d%H%M%S.ts'),
    outputPath
  ];

  // // logger.info(`Starting FFmpeg for camera ${cameraId} with command: ffmpeg ${ffmpegArgs.join(' ')}`);

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  // Xử lý lỗi
  ffmpegProcess.stderr.on('data', (data) => {
    // // logger.error(`FFmpeg error for camera ${cameraId}: ${data.toString()}`);
  });

  ffmpegProcess.on('error', (err) => {
    // // logger.error(`FFmpeg process error for camera ${cameraId}: ${err.message}`);
    cleanupStream(cameraId);
  });

  ffmpegProcess.on('close', (code) => {
    // logger.info(`FFmpeg process for camera ${cameraId} exited with code ${code}`);
    cleanupStream(cameraId);
  });

  // Lưu thông tin stream
  streams[cameraId] = {
    process: ffmpegProcess,
    hlsUrl: hlsUrl,
    startTime: new Date()
  };

  return hlsUrl;
}

function stopStream(cameraId) {
  if (streams[cameraId]) {
    // logger.info(`Stopping stream for camera ${cameraId}`);
    streams[cameraId].process.kill('SIGINT');
    cleanupStream(cameraId);
  }
}

function cleanupStream(cameraId) {
  if (streams[cameraId]) {
    // Xóa các file segment sau khi dừng stream
    const outputDir = path.join(__dirname, '../../public/streams', cameraId);
    if (fs.existsSync(outputDir)) {
      fs.rmdirSync(outputDir, { recursive: true });
    }
    delete streams[cameraId];
  }
}

function getActiveStreams() {
  return Object.keys(streams).map(cameraId => ({
    cameraId,
    hlsUrl: streams[cameraId].hlsUrl,
    uptime: (new Date() - streams[cameraId].startTime) / 1000
  }));
}

module.exports = {
  startStream,
  stopStream,
  getActiveStreams
};