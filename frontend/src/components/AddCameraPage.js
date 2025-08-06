import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Alert,
  Paper,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  Divider,
  Tooltip
} from '@mui/material';
import { ArrowBack, Download, Upload } from '@mui/icons-material';
import axios from 'axios';

const AddCameraPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamType, setStreamType] = useState('rtsp');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Config.json format fields
  const [hlsUrl, setHlsUrl] = useState('');
  const [frameWidth, setFrameWidth] = useState(1920);
  const [frameHeight, setFrameHeight] = useState(1080);
  const [showRoi, setShowRoi] = useState(true);
  const [showLine, setShowLine] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [resetInterval, setResetInterval] = useState(3600);
  const [resetTime, setResetTime] = useState('00:00');
  const [enableAutoReset, setEnableAutoReset] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim() || !streamUrl.trim()) {
      setError('Tên camera và URL stream là bắt buộc');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5008/api/cameras', {
        name: name.trim(),
        streamUrl: streamUrl.trim(),
        streamType,
        description: description.trim(),
        // Config fields
        hlsUrl,
        frameWidth,
        frameHeight,
        showRoi,
        showLine,
        showStats,
        resetInterval,
        resetTime,
        enableAutoReset
      });

      // Navigate back to camera list on success
      navigate('/cameras', { 
        state: { 
          message: `Camera "${response.data.name}" đã được thêm thành công!` 
        } 
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi thêm camera');
    } finally {
      setLoading(false);
    }
  };

  // Export to config.json format
  const handleExportConfig = () => {
    const config = {
      stream_url: streamUrl,
      hls_url: hlsUrl,
      frame_width: frameWidth,
      frame_height: frameHeight,
      show_roi: showRoi,
      show_line: showLine,
      show_stats: showStats,
      reset_interval: resetInterval,
      reset_time: resetTime,
      enable_auto_reset: enableAutoReset
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(config, null, 4)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.trim() || 'camera'}_config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import from config.json file
  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const config = JSON.parse(text);

        // Validate config structure
        if (!config.stream_url) {
          setError('File config không hợp lệ: thiếu stream_url');
          return;
        }

        // Load config values into form
        setStreamUrl(config.stream_url || '');
        setHlsUrl(config.hls_url || '');
        setFrameWidth(config.frame_width || 1920);
        setFrameHeight(config.frame_height || 1080);
        setShowRoi(config.show_roi !== undefined ? config.show_roi : true);
        setShowLine(config.show_line !== undefined ? config.show_line : true);
        setShowStats(config.show_stats !== undefined ? config.show_stats : true);
        setResetInterval(config.reset_interval || 3600);
        setResetTime(config.reset_time || '00:00');
        setEnableAutoReset(config.enable_auto_reset !== undefined ? config.enable_auto_reset : true);

        // Auto-fill camera name from filename
        const filename = file.name.replace('.json', '').replace('_config', '');
        if (!name.trim()) {
          setName(filename);
        }

        setError('');
        alert('Import config thành công!');
        
      } catch (err) {
        console.error('Import error:', err);
        setError('Lỗi khi import file config: ' + err.message);
      }
    };
    input.click();
  };

  // Get preview of config JSON
  const getConfigPreview = () => {
    return {
      stream_url: streamUrl || "rtsp://...",
      hls_url: hlsUrl,
      frame_width: frameWidth,
      frame_height: frameHeight,
      show_roi: showRoi,
      show_line: showLine,
      show_stats: showStats,
      reset_interval: resetInterval,
      reset_time: resetTime,
      enable_auto_reset: enableAutoReset
    };
  };

  const getStreamTypeHelperText = () => {
    switch (streamType) {
      case 'rtsp':
        return 'VD: rtsp://username:password@192.168.1.100:554/stream1';
      case 'http':
        return 'VD: http://192.168.1.100:8080/video.mjpg';
      case 'hls':
        return 'VD: http://192.168.1.100:8080/hls/stream.m3u8';
      case 'mjpeg':
        return 'VD: http://192.168.1.100:8080/mjpeg_stream';
      default:
        return '';
    }
  };
  

  return (
    <Container maxWidth="md">
      <Box mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/cameras')}
          disabled={loading}
        >
          Quay lại danh sách Camera
        </Button>
      </Box>

      <Paper>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Thêm Camera Mới
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Hướng dẫn:</strong>
              </Typography>
              <Typography variant="body2" component="div">
                • <strong>Import:</strong> Tải lên file config.json có sẵn để điền tự động các trường
                <br />
                • <strong>Export:</strong> Xuất cấu hình dưới định dạng config.json cho hệ thống AI
                <br />
                • Cấu hình các thông số cơ bản cho camera và hệ thống đếm xe
              </Typography>
            </Alert>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Typography variant="h6" gutterBottom>
                Thông tin cơ bản
              </Typography>
              
              <TextField
                label="Tên camera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                margin="normal"
                required
                disabled={loading}
                helperText="Tên để nhận diện camera trong hệ thống"
              />

              <FormControl fullWidth margin="normal" required>
                <InputLabel>Loại stream</InputLabel>
                <Select
                  value={streamType}
                  onChange={(e) => setStreamType(e.target.value)}
                  label="Loại stream"
                  disabled={loading}
                >
                  <MenuItem value="hls">HLS - HTTP Live Streaming</MenuItem>
                  <MenuItem value="rtsp">RTSP - Real Time Streaming Protocol</MenuItem>
                  <MenuItem value="http">HTTP - HTTP Video Stream</MenuItem>
                  <MenuItem value="mjpeg">MJPEG - Motion JPEG Stream</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="URL stream"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                fullWidth
                margin="normal"
                required
                disabled={loading}
                helperText={getStreamTypeHelperText()}
                placeholder={getStreamTypeHelperText()}
              />

              <TextField
                label="HLS URL"
                value={hlsUrl}
                onChange={(e) => setHlsUrl(e.target.value)}
                fullWidth
                margin="normal"
                required
                disabled={loading}
                helperText="http://192.168.1.100:8080/hls/stream.m3u8"
                placeholder="http://192.168.1.100:8080/hls/stream.m3u8"
              />

              <TextField
                label="Mô tả"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                margin="normal"
                multiline
                rows={3}
                disabled={loading}
                helperText="Mô tả vị trí, chức năng hoặc ghi chú về camera (tùy chọn)"
              />

              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Cấu hình Video
              </Typography>

              <Box display="flex" gap={2}>
                <TextField
                  label="Chiều rộng khung hình"
                  type="number"
                  value={frameWidth}
                  onChange={(e) => setFrameWidth(parseInt(e.target.value) || 1920)}
                  disabled={loading}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Chiều cao khung hình"
                  type="number"
                  value={frameHeight}
                  onChange={(e) => setFrameHeight(parseInt(e.target.value) || 1080)}
                  disabled={loading}
                  sx={{ flex: 1 }}
                />
              </Box>

              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Cài đặt hiển thị
              </Typography>

              <Box display="flex" flexDirection="column" gap={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showRoi}
                      onChange={(e) => setShowRoi(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Hiển thị ROI (Vùng quan tâm)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showLine}
                      onChange={(e) => setShowLine(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Hiển thị đường đếm"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showStats}
                      onChange={(e) => setShowStats(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Hiển thị thống kê"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={enableAutoReset}
                      onChange={(e) => setEnableAutoReset(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Bật tự động reset"
                />
              </Box>

              <Box display="flex" gap={2} mt={2}>
                <TextField
                  label="Khoảng thời gian reset (giây)"
                  type="number"
                  value={resetInterval}
                  onChange={(e) => setResetInterval(parseInt(e.target.value) || 3600)}
                  disabled={loading}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Thời gian reset"
                  value={resetTime}
                  onChange={(e) => setResetTime(e.target.value)}
                  disabled={loading}
                  sx={{ flex: 1 }}
                  helperText="Định dạng: HH:MM"
                />
              </Box>

              <Divider sx={{ my: 3 }} />
              
              <Box>
                <Typography variant="h6" gutterBottom>
                  Preview Config.json
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    backgroundColor: '#f5f5f5',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}
                >
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(getConfigPreview(), null, 2)}
                  </Typography>
                </Paper>
              </Box>

              <Box mt={3} display="flex" gap={2} flexWrap="wrap">
                <Button
                  onClick={() => navigate('/cameras')}
                  disabled={loading}
                  color="secondary"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !name.trim() || !streamUrl.trim()}
                >
                  {loading ? 'Đang thêm...' : 'Thêm Camera'}
                </Button>
                <Tooltip title="Import cấu hình từ file config.json">
                  <Button
                    startIcon={<Upload />}
                    onClick={handleImportConfig}
                    disabled={loading}
                    variant="outlined"
                    color="secondary"
                  >
                    Import Config.json
                  </Button>
                </Tooltip>
                <Tooltip title="Xuất cấu hình dưới định dạng config.json">
                  <Button
                    startIcon={<Download />}
                    onClick={handleExportConfig}
                    disabled={loading}
                    variant="outlined"
                  >
                    Xuất Config.json
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Paper>
    </Container>
  );
};

export default AddCameraPage;