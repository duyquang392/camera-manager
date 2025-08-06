import React, { useRef, useEffect, useState } from 'react';
import { Box, Alert, CircularProgress, Typography } from '@mui/material';
import Hls from 'hls.js';

const VideoPlayer = ({ 
  camera, 
  zones = [], 
  showZones = true, 
  onVideoClick = null,
  isDrawingMode = false,
  editingPoints = [],
  selectedPointIndex = null
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamReady, setStreamReady] = useState(false);

  useEffect(() => {
    if (!camera?.hlsUrl) return;

    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(null);
    setStreamReady(false);

    // Cleanup previous stream
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const initializeStream = async () => {
      try {
        const streamType = camera.streamType || 'rtsp';
        
        switch (streamType.toLowerCase()) {
          case 'hls':
            await initializeHLS(video, camera.hlsUrl);
            break;
          case 'rtsp':
            // For RTSP, we might need to convert to HLS via backend
            await initializeRTSP(video, camera);
            break;
          case 'http':
          case 'mjpeg':
            await initializeDirectStream(video, camera.hlsUrl);
            break;
          default:
            throw new Error(`Unsupported stream type: ${streamType}`);
        }
      } catch (err) {
        console.error('Stream initialization error:', err);
        setError(`Không thể phát stream: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    initializeStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [camera]);

  const initializeHLS = async (video, hlsUrl) => {
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      
      hlsRef.current = hls;
      
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS media attached');
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed');
        setStreamReady(true);
        video.play().catch(e => console.warn('Autoplay prevented:', e));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Lỗi mạng khi tải stream HLS');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Lỗi media trong stream HLS');
              break;
            default:
              setError('Lỗi không xác định trong stream HLS');
              break;
          }
        }
      });
      console.log('Initializing HLS for stream:', hlsUrl);
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setStreamReady(true);
        video.play().catch(e => console.warn('Autoplay prevented:', e));
      });
    } else {
      throw new Error('HLS not supported in this browser');
    }
  };

  const initializeRTSP = async (video, camera) => {
    // For RTSP streams, we need to check if there's a corresponding HLS conversion
    // This would typically be handled by a media server like go2rtc or FFmpeg
    try {
      // Try to get HLS stream from backend for this RTSP camera
      const hlsUrl = `http://localhost:8000/api/hls/output/${camera._id}/playlist.m3u8`;
      await initializeHLS(video, hlsUrl);
    } catch (err) {
      // Fallback: suggest using a media server
      throw new Error('RTSP stream cần media server để chuyển đổi sang HLS. Vui lòng kiểm tra cấu hình go2rtc hoặc FFmpeg.');
    }
  };

  const initializeDirectStream = async (video, hlsUrl) => {
    video.src = hlsUrl;
    
    video.addEventListener('loadedmetadata', () => {
      setStreamReady(true);
      video.play().catch(e => console.warn('Autoplay prevented:', e));
    });

    video.addEventListener('error', (e) => {
      console.error('Video error:', e);
      setError('Không thể tải stream trực tiếp');
    });
  };

  const handleVideoClick = (event) => {
    if (onVideoClick && isDrawingMode) {
      const rect = videoRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      onVideoClick({ x, y });
    }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 10
          }}
        >
          <Box textAlign="center">
            <CircularProgress />
            <Typography variant="body2" color="white" mt={1}>
              Đang tải stream...
            </Typography>
          </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          {error}
        </Alert>
      )}

      <video
        ref={videoRef}
        controls={!isDrawingMode}
        autoPlay
        muted
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
          cursor: isDrawingMode ? 'crosshair' : 'default'
        }}
        onClick={handleVideoClick}
      />

      {/* Zone overlay */}
      {showZones && (zones.length > 0 || editingPoints.length > 0) && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: isDrawingMode ? 'none' : 'auto'
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Existing zones */}
          {zones.map((zone, index) => (
            <g key={`zone-${index}`}>
              <polygon
                points={zone.points.map(p => `${p.x},${p.y}`).join(' ')}
                fill={zone.isEditing ? "rgba(255, 255, 0, 0.3)" : "rgba(0, 255, 0, 0.3)"}
                stroke={zone.isEditing ? "yellow" : "green"}
                strokeWidth="0.2"
              />
              {zone.name && (
                <text
                  x={zone.points[0]?.x || 0}
                  y={zone.points[0]?.y || 0}
                  fill="white"
                  stroke="black"
                  strokeWidth="0.1"
                  fontSize="2"
                  fontFamily="Arial, sans-serif"
                >
                  {zone.name}
                </text>
              )}
            </g>
          ))}

          {/* Editing points visualization */}
          {isDrawingMode && editingPoints.length > 0 && (
            <g>
              {/* Current polygon being drawn */}
              <polygon
                points={editingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="rgba(255, 255, 0, 0.3)"
                stroke="yellow"
                strokeWidth="0.2"
              />
              
              {/* Individual points */}
              {editingPoints.map((point, index) => (
                <circle
                  key={`editing-point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={selectedPointIndex === index ? "0.8" : "0.5"}
                  fill={selectedPointIndex === index ? "yellow" : "red"}
                  stroke="white"
                  strokeWidth="0.1"
                />
              ))}
            </g>
          )}
        </svg>
      )}

      {/* Drawing mode instructions */}
      {isDrawingMode && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: 1,
            borderRadius: 1,
            fontSize: '0.875rem'
          }}
        >
          <Typography variant="body2">
            🎯 Chế độ vẽ: Nhấn chuột trái để thêm điểm, kéo để di chuyển điểm, nhấn 'd' để hoàn thành vùng
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default VideoPlayer;