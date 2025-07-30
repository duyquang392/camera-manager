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
  CardContent
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import axios from 'axios';

const AddCameraPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamType, setStreamType] = useState('hls');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        description: description.trim()
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
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
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
                  {/* <MenuItem value="rtsp">RTSP - Real Time Streaming Protocol</MenuItem> */}
                  {/* <MenuItem value="http">HTTP - HTTP Video Stream</MenuItem> */}
                  <MenuItem value="hls">HLS - HTTP Live Streaming</MenuItem>
                  {/* <MenuItem value="mjpeg">MJPEG - Motion JPEG Stream</MenuItem> */}
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

              <Box mt={3} display="flex" gap={2}>
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
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Paper>
    </Container>
  );
};

export default AddCameraPage;