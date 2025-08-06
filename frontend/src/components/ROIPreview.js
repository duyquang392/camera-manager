import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';

const ROIPreview = ({ rois, frameWidth, frameHeight, imageUrl, onRoiUpdate }) => {
  const canvasRef = useRef(null);
  const [selectedRoi, setSelectedRoi] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPointIndex, setDragPointIndex] = useState(-1);

  useEffect(() => {
    drawCanvas();
  }, [rois, frameWidth, frameHeight, selectedRoi]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Calculate scale
    const scaleX = canvasWidth / frameWidth;
    const scaleY = canvasHeight / frameHeight;

    // Draw background grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvasWidth; x += gridSize * scaleX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += gridSize * scaleY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    // Draw ROIs
    rois.forEach((roi, roiIndex) => {
      const isSelected = selectedRoi === roiIndex;
      
      // Scale points
      const scaledPoints = roi.points.map(point => [
        point[0] * scaleX,
        point[1] * scaleY
      ]);

      // Draw filled polygon
      ctx.fillStyle = isSelected ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)';
      ctx.beginPath();
      ctx.moveTo(scaledPoints[0][0], scaledPoints[0][1]);
      for (let i = 1; i < scaledPoints.length; i++) {
        ctx.lineTo(scaledPoints[i][0], scaledPoints[i][1]);
      }
      ctx.closePath();
      ctx.fill();

      // Draw outline
      ctx.strokeStyle = isSelected ? '#ff0000' : '#00ff00';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Draw points
      scaledPoints.forEach((point, pointIndex) => {
        ctx.fillStyle = isSelected ? '#ff0000' : '#00ff00';
        ctx.beginPath();
        ctx.arc(point[0], point[1], 6, 0, 2 * Math.PI);
        ctx.fill();

        // Draw point labels
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.fillText(`${pointIndex + 1}`, point[0] + 8, point[1] - 8);
      });

      // Draw ROI name
      const centerX = scaledPoints.reduce((sum, point) => sum + point[0], 0) / scaledPoints.length;
      const centerY = scaledPoints.reduce((sum, point) => sum + point[1], 0) / scaledPoints.length;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`ROI ${roi.name}`, centerX, centerY);
      ctx.textAlign = 'left';
    });
  };

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const scaleX = frameWidth / canvas.width;
    const scaleY = frameHeight / canvas.height;
    const realX = x * scaleX;
    const realY = y * scaleY;

    // Check if click is on any ROI
    for (let roiIndex = 0; roiIndex < rois.length; roiIndex++) {
      const roi = rois[roiIndex];
      
      // Check if click is on any point
      for (let pointIndex = 0; pointIndex < roi.points.length; pointIndex++) {
        const point = roi.points[pointIndex];
        const distance = Math.sqrt(
          Math.pow(realX - point[0], 2) + Math.pow(realY - point[1], 2)
        );
        
        if (distance < 20) { // 20px threshold
          setSelectedRoi(roiIndex);
          return;
        }
      }

      // Check if click is inside ROI polygon
      if (isPointInPolygon([realX, realY], roi.points)) {
        setSelectedRoi(roiIndex);
        return;
      }
    }

    // If no ROI was clicked, deselect
    setSelectedRoi(-1);
  };

  const isPointInPolygon = (point, polygon) => {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        ROI Preview
      </Typography>
      
      <Box 
        sx={{ 
          border: '1px solid #ccc',
          borderRadius: 1,
          overflow: 'hidden',
          mb: 2
        }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          style={{ 
            width: '100%', 
            height: 'auto',
            cursor: 'crosshair',
            display: 'block'
          }}
          onClick={handleCanvasClick}
        />
      </Box>

      <Box display="flex" gap={2} alignItems="center">
        <Typography variant="body2">
          Khung hình: {frameWidth}x{frameHeight}px
        </Typography>
        <Typography variant="body2">
          ROIs: {rois.length}
        </Typography>
        {selectedRoi >= 0 && (
          <Typography variant="body2" color="primary">
            Đã chọn: ROI {rois[selectedRoi].name}
          </Typography>
        )}
      </Box>

      <Box mt={2}>
        <Typography variant="body2" color="text.secondary">
          • Click vào ROI để chọn
          • ROI màu xanh lá: bình thường
          • ROI màu đỏ: đang được chọn
          • Lưới giúp định vị tọa độ chính xác
        </Typography>
      </Box>
    </Paper>
  );
};

export default ROIPreview;
