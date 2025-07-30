import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Alert
} from '@mui/material';
import { Edit, Add, ArrowBack } from '@mui/icons-material';
import axios from 'axios';
import ZoneList from './ZoneList';
import ZoneEditor from './ZoneEditor';
import VideoPlayer from './VideoPlayer';

const CameraDetail = () => {
  const { id } = useParams();
  const [camera, setCamera] = useState(null);
  const [zones, setZones] = useState([]);
  const [editingZone, setEditingZone] = useState(null);
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    fetchCamera();
    fetchZones();
  }, [id]);


  const fetchCamera = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5008/api/cameras/${id}`);
      setCamera(response.data);
    } catch (error) {
      console.error('Error fetching camera:', error);
      setError('Không thể tải thông tin camera');
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const response = await axios.get(`http://localhost:5008/api/zones/camera/${id}`);
      setZones(response.data);
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const handleAddZone = () => {
    setEditingZone(null);
    setShowZoneEditor(true);
  };

  const handleEditZone = (zone) => {
    setEditingZone(zone);
    setShowZoneEditor(true);
  };

  const handleZoneEditorClose = () => {
    setShowZoneEditor(false);
    fetchZones();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button component={Link} to="/cameras" startIcon={<ArrowBack />}>
          Quay lại danh sách
        </Button>
      </Box>
    );
  }

  if (!camera) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Không tìm thấy camera
        </Alert>
        <Button component={Link} to="/cameras" startIcon={<ArrowBack />}>
          Quay lại danh sách
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={2}>
        <Button component={Link} to="/cameras" startIcon={<ArrowBack />}>
          Quay lại danh sách
        </Button>
      </Box>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography variant="h4" component="h1">
          {camera.name}
        </Typography>
        <Chip 
          label={camera.streamType?.toUpperCase() || 'RTSP'} 
          color="primary" 
          variant="outlined" 
        />
      </Box>
      
      {camera.description && (
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {camera.description}
        </Typography>
      )}
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Stream URL: {camera.streamUrl}
      </Typography>

      <Box display="flex" justifyContent="space-between" mb={3}>
        <Button
          variant="contained"
          component={Link}
          to={`/cameras/${id}/edit`}
          startIcon={<Edit />}
        >
          Edit Camera
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleAddZone}
          startIcon={<Add />}
        >
          Add Zone
        </Button>
      </Box>

      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Video Stream ({zones.length} zones)
            </Typography>
            <Box sx={{
              position: 'relative',
              paddingTop: '56.25%', // 16:9 aspect ratio
              backgroundColor: 'black',
              borderRadius: 1,
              overflow: 'hidden'
            }}>
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
              }}>
                <VideoPlayer
                  camera={camera}
                  zones={zones}
                  showZones={true}
                />
              </Box>
            </Box>
            
            {/* Stream info */}
            <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Stream Type: {camera.streamType?.toUpperCase() || 'RTSP'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Zones: {zones.length}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Zones</Typography>
            <ZoneList
              zones={zones}
              onEdit={handleEditZone}
              onDelete={fetchZones}
            />
          </CardContent>
        </Card>
      </Box>

      {showZoneEditor && (
        <ZoneEditor
          cameraId={id}
          zone={editingZone}
          onClose={handleZoneEditorClose}
          camera={camera}
        />
      )}
    </Box>
  );
};

export default CameraDetail;