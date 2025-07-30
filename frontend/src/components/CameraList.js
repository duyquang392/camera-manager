import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Button,
  IconButton,
  Checkbox,
  Box,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
  Chip,
  Alert,
  Typography
} from '@mui/material';
import { 
  Delete, 
  Edit, 
  Visibility, 
  Download, 
  MoreVert, 
  PlayArrow, 
  Stop,
  Settings,
  Add 
} from '@mui/icons-material';
import axios from 'axios';
import ConfigManager from './ConfigManager';

const CameraList = () => {
  const location = useLocation();
  const [cameras, setCameras] = useState([]);
  const [selected, setSelected] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [configManagerOpen, setConfigManagerOpen] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const open = Boolean(anchorEl);

  useEffect(() => {
    fetchCameras();
    fetchStreamingStatus();
    
    // Check for success message from navigation
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    }
    
    // Poll streaming status every 30 seconds
    const interval = setInterval(fetchStreamingStatus, 30000);
    return () => clearInterval(interval);
  }, [location]);

  // const fetchCameras = async () => {
  //   setLoading(true);
  //   try {
  //     const response = await axios.get('http://localhost:5008/api/cameras');
  //     setCameras(response.data);
  //     setSelected([]);
  //   } catch (error) {
  //     console.error('Error fetching cameras:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchCameras = async () => {
    setLoading(true);
    try {
      // Lấy danh sách camera
      const camerasResponse = await axios.get('http://localhost:5008/api/cameras');
      const camerasData = camerasResponse.data;

      // Lấy số zone cho từng camera
      const camerasWithZoneCount = await Promise.all(
        camerasData.map(async (camera) => {
          try {
            const zonesResponse = await axios.get(`http://localhost:5008/api/zones/camera/${camera._id}`);
            return {
              ...camera,
              zoneCount: zonesResponse.data.length
            };
          } catch (error) {
            console.error(`Error fetching zones for camera ${camera._id}:`, error);
            return {
              ...camera,
              zoneCount: 0
            };
          }
        })
      );

      setCameras(camerasWithZoneCount);
      setSelected([]);
    } catch (error) {
      console.error('Error fetching cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStreamingStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5008/api/stream/active');
      const activeStreams = response.data.streams || [];
      
      const statusMap = {};
      activeStreams.forEach(stream => {
        statusMap[stream.cameraId] = {
          isActive: true,
          uptime: stream.uptime,
          streamUrl: stream.streamUrl
        };
      });
      
      setStreamingStatus(statusMap);
    } catch (error) {
      console.error('Error fetching streaming status:', error);
    }
  };

  const toggleStream = async (camera) => {
    const isCurrentlyStreaming = streamingStatus[camera._id]?.isActive;
    
    try {
      if (isCurrentlyStreaming) {
        await axios.post(`http://localhost:5008/api/stream/${camera._id}/stop`);
      } else {
        await axios.post(`http://localhost:5008/api/stream/${camera._id}/start`);
      }
      
      // Refresh streaming status
      setTimeout(fetchStreamingStatus, 1000);
    } catch (error) {
      console.error('Error toggling stream:', error);
      alert('Có lỗi xảy ra khi điều khiển stream');
    }
  };

  const deleteCamera = async (id) => {
    try {
      await axios.delete(`http://localhost:5008/api/cameras/${id}`);
      fetchCameras();
    } catch (error) {
      console.error('Error deleting camera:', error);
    }
  };

  const fetchCameraWithZones = async (cameraId) => {
    try {
      const [cameraRes, zonesRes] = await Promise.all([
        axios.get(`http://localhost:5008/api/cameras/${cameraId}`),
        axios.get(`http://localhost:5008/api/zones/camera/${cameraId}`)
      ]);
      return {
        ...cameraRes.data,
        zones: zonesRes.data
      };
    } catch (error) {
      console.error('Error fetching camera details:', error);
      return null;
    }
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = cameras.map((camera) => camera._id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const exportJSON = async (exportOption) => {
    setLoading(true);
    try {
      let dataToExport = [];
      
      if (exportOption === 'all') {
        // Fetch all cameras with their zones
        const camerasWithZones = await Promise.all(
          cameras.map(camera => fetchCameraWithZones(camera._id))
        );
        dataToExport = camerasWithZones.filter(Boolean);
      } 
      else if (exportOption === 'selected') {
        // Fetch selected cameras with their zones
        const selectedCamerasWithZones = await Promise.all(
          selected.map(id => {
            const camera = cameras.find(c => c._id === id);
            return fetchCameraWithZones(camera._id);
          })
        );
        dataToExport = selectedCamerasWithZones.filter(Boolean);
      }
      else {
        // Single camera case
        const cameraWithZones = await fetchCameraWithZones(exportOption);
        if (cameraWithZones) {
          dataToExport = [cameraWithZones];
        }
      }

      if (dataToExport.length === 0) {
        alert('No valid camera configurations to export');
        return;
      }

      // Format for AI processing server
      const exportData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        configurations: dataToExport.map(camera => ({
          camera_id: camera._id,
          camera_name: camera.name,
          stream_url: camera.streamUrl,
          description: camera.description,
          zones: camera.zones.map(zone => ({
            zone_id: zone._id,
            zone_name: zone.name,
            counting_direction: zone.countingDirection,
            polygon_points: zone.points,
            // Add any additional zone parameters needed by AI server
            sensitivity: 0.5, // Example parameter
            object_classes: ["person", "vehicle"] // Example parameter
          }))
        }))
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileName = exportOption === 'all' ? 'all_cameras_full_config.json' : 
                          exportOption === 'selected' ? `selected_${selected.length}_cameras_config.json` : 
                          `camera_${dataToExport[0].name}_config.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
      
    } catch (error) {
      console.error('Error during export:', error);
      alert('Failed to export configurations');
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" component="h1">
          Danh sách Camera
        </Typography>
        {/* <Button
          component={Link}
          to="/cameras/add"
          variant="contained"
          color="primary"
          startIcon={<Add />}
          disabled={loading}
        >
          Thêm Camera
        </Button> */}
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Button
          variant="outlined"
          startIcon={<Settings />}
          onClick={() => setConfigManagerOpen(true)}
        >
          Quản lý cấu hình
        </Button>
        
        <Box display="flex" gap={1}>
          {loading && <CircularProgress size={24} sx={{ mr: 2 }} />}
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Download />}
            onClick={handleMenuClick}
            disabled={cameras.length === 0 || loading}
          >
            Export Config
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < cameras.length}
                  checked={cameras.length > 0 && selected.length === cameras.length}
                  onChange={handleSelectAllClick}
                  disabled={loading}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Stream Type</TableCell>
              <TableCell>Stream URL</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Zones</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && cameras.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : cameras.map((camera) => {
              const isItemSelected = isSelected(camera._id);
              const streamStatus = streamingStatus[camera._id];
              
              return (
                <TableRow 
                  key={camera._id}
                  hover
                  role="checkbox"
                  aria-checked={isItemSelected}
                  selected={isItemSelected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      onClick={(event) => handleClick(event, camera._id)}
                      disabled={loading}
                    />
                  </TableCell>
                  <TableCell>{camera.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={camera.streamType?.toUpperCase() || 'RTSP'} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={camera.streamUrl}>
                      <span>{camera.streamUrl.length > 30 ? `${camera.streamUrl.substring(0, 30)}...` : camera.streamUrl}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={streamStatus?.isActive ? 'Streaming' : 'Offline'} 
                        color={streamStatus?.isActive ? 'success' : 'default'}
                        size="small"
                      />
                      {streamStatus?.isActive && (
                        <Tooltip title={`Uptime: ${streamStatus.uptime}s`}>
                          <Chip 
                            label={`${streamStatus.uptime}s`} 
                            size="small" 
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {camera.zoneCount || 0} zones
                  </TableCell>
                  <TableCell>
                    {camera.description && (
                      <Tooltip title={camera.description}>
                        <span>{camera.description.length > 50 ? `${camera.description.substring(0, 50)}...` : camera.description}</span>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Tooltip title={streamStatus?.isActive ? 'Stop Stream' : 'Start Stream'}>
                        <IconButton 
                          onClick={() => toggleStream(camera)} 
                          color={streamStatus?.isActive ? 'error' : 'success'}
                          size="small"
                        >
                          {streamStatus?.isActive ? <Stop /> : <PlayArrow />}
                        </IconButton>
                      </Tooltip>
                      <IconButton component={Link} to={`/cameras/${camera._id}`} title="View" disabled={loading} size="small">
                        <Visibility />
                      </IconButton>
                      <IconButton component={Link} to={`/cameras/${camera._id}/edit`} title="Edit" disabled={loading} size="small">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => deleteCamera(camera._id)} title="Delete" disabled={loading} size="small">
                        <Delete />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => exportJSON('all')} disabled={loading}>
          Export All Cameras (with zones)
        </MenuItem>
        <MenuItem 
          onClick={() => exportJSON('selected')} 
          disabled={selected.length === 0 || loading}
        >
          Export Selected Cameras ({selected.length})
        </MenuItem>
      </Menu>

      <ConfigManager 
        open={configManagerOpen}
        onClose={() => setConfigManagerOpen(false)}
        cameras={cameras}
      />
    </div>
  );
};

export default CameraList;      