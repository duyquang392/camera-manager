import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Paper
} from '@mui/material';
import axios from 'axios';
import VideoPlayer from './VideoPlayer';

const ZoneEditor = ({ cameraId, zone, onClose, camera }) => {
  const [name, setName] = useState(zone?.name || '');
  const [countingDirection, setCountingDirection] = useState(zone?.countingDirection || 'both');
  const [points, setPoints] = useState(zone?.points || []);
  const [existingZones, setExistingZones] = useState([]);
  const [instructions, setInstructions] = useState('Nhấn "d" để vào chế độ vẽ');
  const [drawingMode, setDrawingMode] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const wrapperRef = useRef(null);

  // Calculate convex hull using Graham Scan algorithm
  const calculateConvexHull = useCallback((points) => {
    if (points.length < 3) return points;

    // Find the point with the lowest y-coordinate (and leftmost if ties)
    let pivot = points[0];
    for (let i = 1; i < points.length; i++) {
      if (points[i].y < pivot.y ||
        (points[i].y === pivot.y && points[i].x < pivot.x)) {
        pivot = points[i];
      }
    }

    // Sort points by polar angle with pivot
    const sortedPoints = [...points].sort((a, b) => {
      const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
      const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
      if (angleA < angleB) return -1;
      if (angleA > angleB) return 1;

      // If angles are same, sort by distance to pivot
      const distA = Math.pow(a.x - pivot.x, 2) + Math.pow(a.y - pivot.y, 2);
      const distB = Math.pow(b.x - pivot.x, 2) + Math.pow(b.y - pivot.y, 2);
      return distA - distB;
    });

    // Build convex hull
    const hull = [sortedPoints[0], sortedPoints[1]];

    for (let i = 2; i < sortedPoints.length; i++) {
      let top = hull.length - 1;
      while (hull.length > 1 && crossProduct(hull[top - 1], hull[top], sortedPoints[i]) <= 0) {
        hull.pop();
        top--;
      }
      hull.push(sortedPoints[i]);
    }

    return hull;
  }, []);

  // Helper function for cross product
  const crossProduct = (a, b, c) => {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  };

  // Update instructions based on current state
  const updateInstructions = useCallback(() => {
    if (!drawingMode) {
      setInstructions('Nhấn "d" để vào chế độ vẽ');
      return;
    }

    if (isDragging) {
      setInstructions('Kéo để di chuyển điểm. Nhấn chuột để xác nhận.');
    } else if (points.length > 2) {
      setInstructions('Nhấn "d" để hoàn thành vùng hoặc tiếp tục thêm điểm');
    } else {
      setInstructions('Nhấn chuột trái để thêm điểm');
    }
  }, [drawingMode, isDragging, points.length]);

  // Fetch existing zones and initialize state
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await axios.get(`http://localhost:5008/api/zones/camera/${cameraId}`);
        setExistingZones(response.data);
      } catch (error) {
        console.error('Error fetching zones:', error);
      }
    };

    if (cameraId) fetchZones();

    if (zone) {
      setName(zone.name);
      setCountingDirection(zone.countingDirection);
      setPoints(zone.points);
    } else if (points.length === 0) {
      setName('');
      setCountingDirection('both');
      setPoints([]);
    }

    updateInstructions();

    const handleKeyDown = (e) => {
      switch (e.key.toLowerCase()) {
        case 'd':
          if (!isDragging) {
            if (drawingMode && points.length > 2) {
              handleClosePolygon();
            } else {
              setDrawingMode(!drawingMode);
            }
            updateInstructions();
          }
          break;
        case 'r':
          if (drawingMode && !isDragging) {
            handleRemoveLastPoint();
          }
          break;
        case 'escape':
          if (drawingMode) {
            setDrawingMode(false);
            setSelectedPointIndex(null);
            setIsDragging(false);
            updateInstructions();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameraId, zone, drawingMode, isDragging, points.length, updateInstructions]);

  // Handle video click for adding/dragging points
  const handleVideoClick = useCallback((clickPoint) => {
    if (!drawingMode) return;

    const { x, y } = clickPoint;

    // Check if click is near an existing point for dragging
    const clickedPointIndex = points.findIndex(
      p => Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2)) < 2
    );

    if (clickedPointIndex !== -1) {
      setSelectedPointIndex(clickedPointIndex);
      setIsDragging(true);
      return;
    }

    // Add new point
    setPoints([...points, { x, y }]);
    updateInstructions();
  }, [drawingMode, points, updateInstructions]);

  // Handle mouse move for dragging points
  const handleMouseMove = useCallback((event) => {
    if (!drawingMode || !isDragging || selectedPointIndex === null || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const updatedPoints = [...points];
    updatedPoints[selectedPointIndex] = { x, y };
    setPoints(updatedPoints);
  }, [drawingMode, isDragging, selectedPointIndex, points]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setSelectedPointIndex(null);
    updateInstructions();
  }, [updateInstructions]);

  // Point management functions
  const handleRemoveLastPoint = () => {
    if (points.length > 0) {
      setPoints(points.slice(0, -1));
      updateInstructions();
    }
  };

  const handleClearPoints = () => {
    setPoints([]);
    setSelectedPointIndex(null);
    updateInstructions();
  };

  const handleClosePolygon = () => {
    if (points.length > 2) {
      // Calculate convex hull and close the polygon
      const convexHull = calculateConvexHull(points);
      setPoints(convexHull);
      setDrawingMode(false);
      updateInstructions();
    }
  };

  // Form submission
  const handleSubmit = async () => {
    try {
      const trimmedName = name.trim();

      if (!trimmedName) {
        alert('Tên vùng là bắt buộc.');
        return;
      }

      const isDuplicateName = existingZones.some(
        (z) => z.name === trimmedName && (!zone || z._id !== zone._id)
      );

      if (isDuplicateName) {
        alert('Tên vùng phải là duy nhất.');
        return;
      }

      const zoneData = {
        cameraId,
        name: trimmedName,
        points,
        countingDirection
      };

      if (zone) {
        await axios.patch(`http://localhost:5008/api/zones/${zone._id}`, zoneData);
      } else {
        await axios.post('http://localhost:5008/api/zones', zoneData);
      }

      onClose();
    } catch (error) {
      console.error('Lỗi khi lưu vùng:', error);
      alert('Lưu vùng thất bại. Vui lòng kiểm tra console để biết chi tiết.');
    }
  };

  // Prepare zones for VideoPlayer (existing zones + current editing zone)
  const displayZones = [
    ...existingZones.filter(z => !zone || z._id !== zone._id),
    ...(points.length > 0 ? [{ 
      name: name || 'Vùng mới', 
      points, 
      countingDirection,
      isEditing: true 
    }] : [])
  ];

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{zone ? 'Chỉnh sửa vùng' : 'Thêm vùng mới'}</DialogTitle>
      <DialogContent>
        {!drawingMode && (
          <>
            <Box mb={2}>
              <TextField
                label="Tên vùng"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                margin="normal"
                error={existingZones.some(z => z.name === name && (!zone || z._id !== zone._id))}
                helperText={
                  existingZones.some(z => z.name === name && (!zone || z._id !== zone._id))
                    ? 'Tên vùng đã tồn tại'
                    : ''
                }
              />
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle1" gutterBottom>
                Hướng đếm
              </Typography>
              <Box display="flex" gap={2}>
                <Button
                  variant={countingDirection === 'in' ? 'contained' : 'outlined'}
                  onClick={() => setCountingDirection('in')}
                >
                  Vào
                </Button>
                <Button
                  variant={countingDirection === 'out' ? 'contained' : 'outlined'}
                  onClick={() => setCountingDirection('out')}
                >
                  Ra
                </Button>
                <Button
                  variant={countingDirection === 'both' ? 'contained' : 'outlined'}
                  onClick={() => setCountingDirection('both')}
                >
                  Cả hai
                </Button>
              </Box>
            </Box>
          </>
        )}

        <Box mb={2}>
          <Paper elevation={3} sx={{ padding: 2, backgroundColor: drawingMode ? '#fffde7' : 'inherit' }}>
            <Typography variant="subtitle1" gutterBottom>
              {instructions}
            </Typography>

            {drawingMode && (
              <Box display="flex" gap={2} mb={2}>
                <Button variant="outlined" onClick={() => setDrawingMode(false)}>
                  Thoát chế độ vẽ (Esc)
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleRemoveLastPoint}
                  disabled={points.length === 0}
                >
                  Xóa điểm cuối (r)
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClearPoints}
                  disabled={points.length === 0}
                >
                  Xóa tất cả
                </Button>
                <Button
                  variant="contained"
                  onClick={handleClosePolygon}
                  disabled={points.length < 3}
                >
                  Hoàn thành vùng (d)
                </Button>
              </Box>
            )}

            <Box
              ref={wrapperRef}
              sx={{
                position: 'relative',
                paddingTop: '56.25%',
                border: '1px solid #ccc',
                marginBottom: 2,
                backgroundColor: 'black'
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
              }}>
                <VideoPlayer
                  camera={camera}
                  zones={displayZones}
                  showZones={true}
                  onVideoClick={handleVideoClick}
                  isDrawingMode={drawingMode}
                  editingPoints={drawingMode ? points : []}
                  selectedPointIndex={selectedPointIndex}
                />
              </div>
            </Box>

            {drawingMode && (
              <Typography variant="body2">
                Số điểm: {points.length} {points.length > 2 &&
                  "(Nhấn 'd' để hoàn thành vùng)"}
              </Typography>
            )}
          </Paper>
        </Box>

        {!drawingMode && (
          <Box mt={2}>
            <Typography variant="subtitle1">Các vùng hiện có:</Typography>
            {existingZones.map((existingZone, index) => (
              <Box key={`zone-info-${index}`} display="flex" alignItems="center" mb={1}>
                <Box
                  width={20}
                  height={20}
                  bgcolor="rgba(0, 255, 0, 0.3)"
                  border="1px solid green"
                  mr={1}
                />
                <Typography>
                  {existingZone.name} ({existingZone.points.length} điểm) -
                  Hướng đếm: {existingZone.countingDirection === 'in' ? 'Vào' :
                    existingZone.countingDirection === 'out' ? 'Ra' : 'Cả hai'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={points.length < 3 || drawingMode}
        >
          Lưu vùng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ZoneEditor;