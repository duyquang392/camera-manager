import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Typography,
  Alert,
  Chip,
  Stack
} from '@mui/material';
import { Download, Upload, Backup } from '@mui/icons-material';
import axios from 'axios';

const ConfigManager = ({ open, onClose, cameras = [] }) => {
  const [exportType, setExportType] = useState('all');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  // Fetch system stats when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchStats();
    }
  }, [open]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5008/api/config/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError('');

    try {
      let url = 'http://localhost:5008/api/config/export?format=download';
      
      if (exportType === 'camera' && selectedCamera) {
        url = `http://localhost:5008/api/config/export/camera/${selectedCamera}?format=download`;
      }

      // Create a temporary link to download the file
      const response = await axios.get(url, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/json' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Extract filename from Content-Disposition header or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'config.json';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      onClose();
    } catch (error) {
      setError('Có lỗi xảy ra khi xuất cấu hình: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setLoading(true);
      setError('');

      try {
        const text = await file.text();
        const config = JSON.parse(text);

        const response = await axios.post('http://localhost:5008/api/config/import', {
          config,
          replaceExisting: false
        });

        alert(`Import thành công!\nCameras: ${response.data.results.imported.cameras}\nZones: ${response.data.results.imported.zones}`);
        fetchStats(); // Refresh stats
      } catch (error) {
        let errorMessage = 'Có lỗi xảy ra khi import cấu hình';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error instanceof SyntaxError) {
          errorMessage = 'File JSON không hợp lệ';
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const getSelectedCameraName = () => {
    const camera = cameras.find(c => c._id === selectedCamera);
    return camera ? camera.name : '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Backup />
          Quản lý cấu hình
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {stats && (
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Thống kê hệ thống
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip 
                label={`${stats.system.totalCameras} Cameras`} 
                color="primary" 
                size="small" 
              />
              <Chip 
                label={`${stats.system.totalZones} Zones`} 
                color="secondary" 
                size="small" 
              />
              <Chip 
                label={`TB: ${stats.system.averageZonesPerCamera} zones/camera`} 
                variant="outlined" 
                size="small" 
              />
            </Stack>
          </Box>
        )}

        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Xuất cấu hình
          </Typography>
          
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">Loại xuất</FormLabel>
            <RadioGroup
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
            >
              <FormControlLabel 
                value="all" 
                control={<Radio />} 
                label="Toàn bộ hệ thống" 
              />
              <FormControlLabel 
                value="camera" 
                control={<Radio />} 
                label="Camera cụ thể" 
              />
            </RadioGroup>
          </FormControl>

          {exportType === 'camera' && (
            <Box mt={2}>
              <FormControl fullWidth>
                <InputLabel>Chọn camera</InputLabel>
                <Select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  label="Chọn camera"
                >
                  {cameras.map((camera) => (
                    <MenuItem key={camera._id} value={camera._id}>
                      {camera.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>

        <Box mb={2}>
          <Typography variant="h6" gutterBottom>
            Import cấu hình
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Chọn file JSON để import camera và zones. Các mục trùng tên sẽ được bỏ qua.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Đóng
        </Button>
        
        <Button
          onClick={handleImport}
          startIcon={<Upload />}
          disabled={loading}
        >
          Import
        </Button>
        
        <Button
          onClick={handleExport}
          variant="contained"
          startIcon={<Download />}
          disabled={loading || (exportType === 'camera' && !selectedCamera)}
        >
          {loading ? 'Đang xuất...' : 'Xuất file'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfigManager;
