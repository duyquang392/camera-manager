// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   TextField,
//   Box,
//   Typography,
//   Paper
// } from '@mui/material';
// import axios from 'axios';
// import VideoPlayer from './VideoPlayer';

// const ZoneEditor = ({ cameraId, zone, onClose, camera }) => {
//   const [name, setName] = useState(zone?.name || '');
//   const [countingDirection, setCountingDirection] = useState(zone?.countingDirection || 'both');
//   const [points, setPoints] = useState(zone?.points || []);
//   const [existingZones, setExistingZones] = useState([]);
//   const [instructions, setInstructions] = useState('Nhấn "d" để vào chế độ vẽ');
//   const [drawingMode, setDrawingMode] = useState(false);
//   const [selectedPointIndex, setSelectedPointIndex] = useState(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [mouseDownTime, setMouseDownTime] = useState(null);
//   const [justFinishedDragging, setJustFinishedDragging] = useState(false);
//   const wrapperRef = useRef(null);

//   // Calculate convex hull using Graham Scan algorithm
//   const calculateConvexHull = useCallback((points) => {
//     if (points.length < 3) return points;

//     // Find the point with the lowest y-coordinate (and leftmost if ties)
//     let pivot = points[0];
//     for (let i = 1; i < points.length; i++) {
//       if (points[i].y < pivot.y ||
//         (points[i].y === pivot.y && points[i].x < pivot.x)) {
//         pivot = points[i];
//       }
//     }

//     // Sort points by polar angle with pivot
//     const sortedPoints = [...points].sort((a, b) => {
//       const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
//       const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
//       if (angleA < angleB) return -1;
//       if (angleA > angleB) return 1;

//       // If angles are same, sort by distance to pivot
//       const distA = Math.pow(a.x - pivot.x, 2) + Math.pow(a.y - pivot.y, 2);
//       const distB = Math.pow(b.x - pivot.x, 2) + Math.pow(b.y - pivot.y, 2);
//       return distA - distB;
//     });

//     // Build convex hull
//     const hull = [sortedPoints[0], sortedPoints[1]];

//     for (let i = 2; i < sortedPoints.length; i++) {
//       let top = hull.length - 1;
//       while (hull.length > 1 && crossProduct(hull[top - 1], hull[top], sortedPoints[i]) <= 0) {
//         hull.pop();
//         top--;
//       }
//       hull.push(sortedPoints[i]);
//     }

//     return hull;
//   }, []);

//   // Helper function for cross product
//   const crossProduct = (a, b, c) => {
//     return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
//   };

//   // Update instructions based on current state
//   const updateInstructions = useCallback(() => {
//     if (!drawingMode) {
//       setInstructions('Nhấn "d" để vào chế độ vẽ');
//       return;
//     }

//     if (isDragging && selectedPointIndex !== null) {
//       setInstructions(`Đang kéo điểm ${selectedPointIndex + 1}. Nhấn chuột để xác nhận.`);
//     } else if (selectedPointIndex !== null) {
//       setInstructions(`Điểm ${selectedPointIndex + 1} được chọn. Kéo để di chuyển hoặc nhấn Del để xóa.`);
//     } else if (points.length > 2) {
//       setInstructions('Nhấn "d" để hoàn thành vùng, chuột phải để xóa điểm, hoặc tiếp tục thêm điểm');
//     } else {
//       setInstructions('Nhấn chuột trái để thêm điểm, chuột phải để xóa điểm');
//     }
//   }, [drawingMode, isDragging, points.length, selectedPointIndex]);

//   // Fetch existing zones - separate effect to avoid resetting state
//   useEffect(() => {
//     const fetchZones = async () => {
//       try {
//         const response = await axios.get(`http://localhost:5008/api/zones/camera/${cameraId}`);
//         setExistingZones(response.data);
//       } catch (error) {
//         console.error('Error fetching zones:', error);
//       }
//     };

//     if (cameraId) fetchZones();
//   }, [cameraId]);

//   // Initialize state only once when component mounts or zone prop changes
//   useEffect(() => {
//     if (zone) {
//       setName(zone.name);
//       setCountingDirection(zone.countingDirection);
//       setPoints(zone.points);
//     } else {
//       // Only reset if this is a new zone (not editing existing points)
//       setName('');
//       setCountingDirection('both');
//       if (points.length === 0) {
//         setPoints([]);
//       }
//     }
//     updateInstructions();
//   }, [zone, updateInstructions]); // Only depend on zone prop, not points

//   // Point management functions
//   const handleRemoveLastPoint = useCallback(() => {
//     if (points.length > 0) {
//       console.log('Removing last point, current points:', points.length);
//       setPoints(prevPoints => {
//         const newPoints = prevPoints.slice(0, -1);
//         console.log('New points after removing last:', newPoints.length);
//         return newPoints;
//       });
//     }
//   }, [points.length]);

//   const handleClearPoints = useCallback(() => {
//     console.log('Clearing all points');
//     setPoints([]);
//     setSelectedPointIndex(null);
//     setIsDragging(false);
//     setJustFinishedDragging(false);
//   }, []);

//   const handleClosePolygon = useCallback(() => {
//     if (points.length > 2) {
//       console.log('Closing polygon with', points.length, 'points');
//       // Calculate convex hull and close the polygon
//       const convexHull = calculateConvexHull(points);
//       setPoints(convexHull);
//       setDrawingMode(false);
//       setSelectedPointIndex(null);
//       setIsDragging(false);
//       setJustFinishedDragging(false);
//     }
//   }, [points, calculateConvexHull]);

//   // Keyboard event handler - separate effect
//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       console.log('Key pressed:', e.key);
//       switch (e.key.toLowerCase()) {
//         case 'd':
//           e.preventDefault();
//           if (!isDragging) {
//             if (drawingMode && points.length > 2) {
//               console.log('Closing polygon');
//               handleClosePolygon();
//             } else {
//               console.log('Toggling drawing mode from', drawingMode, 'to', !drawingMode);
//               setDrawingMode(!drawingMode);
//             }
//           }
//           break;
//         case 'r':
//           e.preventDefault();
//           if (drawingMode && !isDragging) {
//             console.log('Removing last point');
//             handleRemoveLastPoint();
//           }
//           break;
//         case 'escape':
//           e.preventDefault();
//           if (drawingMode) {
//             console.log('Exiting drawing mode');
//             setDrawingMode(false);
//             setSelectedPointIndex(null);
//             setIsDragging(false);
//             setJustFinishedDragging(false);
//           }
//           break;
//         case 'delete':
//         case 'backspace':
//           e.preventDefault();
//           if (drawingMode && selectedPointIndex !== null && points.length > 1) {
//             console.log('Deleting selected point:', selectedPointIndex);
//             setPoints(prevPoints => {
//               const newPoints = prevPoints.filter((_, index) => index !== selectedPointIndex);
//               console.log('Points after deletion:', newPoints.length);
//               return newPoints;
//             });
//             setSelectedPointIndex(null);
//             setIsDragging(false);
//             setJustFinishedDragging(false);
//           }
//           break;
//         default:
//           break;
//       }
//     };

//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [drawingMode, isDragging, points.length, selectedPointIndex, handleRemoveLastPoint, handleClosePolygon]);

//   // Update instructions when relevant state changes
//   useEffect(() => {
//     updateInstructions();
//   }, [updateInstructions]);

//   const handleMouseMove = useCallback((event) => {
//     if (!drawingMode || !wrapperRef.current) return;
    
//     // If we have a selected point and mouse is down for more than 100ms, start dragging
//     if (selectedPointIndex !== null && mouseDownTime && !isDragging) {
//       if (Date.now() - mouseDownTime > 100) {
//         console.log('Starting drag for point:', selectedPointIndex);
//         setIsDragging(true);
//       }
//     }
    
//     // Only move point if we're actually dragging
//     if (!isDragging || selectedPointIndex === null) return;

//     console.log('Moving point:', selectedPointIndex);
//     const rect = wrapperRef.current.getBoundingClientRect();
//     const x = ((event.clientX - rect.left) / rect.width) * 100;
//     const y = ((event.clientY - rect.top) / rect.height) * 100;

//     // Clamp coordinates to stay within bounds
//     const clampedX = Math.max(0, Math.min(100, x));
//     const clampedY = Math.max(0, Math.min(100, y));

//     console.log('New position:', { x: clampedX, y: clampedY });

//     setPoints(prevPoints => {
//       const updatedPoints = [...prevPoints];
//       updatedPoints[selectedPointIndex] = { x: clampedX, y: clampedY };
//       console.log('Updated points array:', updatedPoints);
//       return updatedPoints;
//     });
//   }, [drawingMode, isDragging, selectedPointIndex, mouseDownTime]);

//   const handleMouseDown = useCallback((event) => {
//     if (!drawingMode || !wrapperRef.current) return;
    
//     console.log('Mouse down event');
//     const rect = wrapperRef.current.getBoundingClientRect();
//     const x = ((event.clientX - rect.left) / rect.width) * 100;
//     const y = ((event.clientY - rect.top) / rect.height) * 100;

//     console.log('Mouse down at:', { x, y });

//     // Check if mouse down is on an existing point
//     const clickedPointIndex = points.findIndex(
//       p => {
//         const distance = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2));
//         console.log(`Distance to point ${points.indexOf(p)}:`, distance);
//         return distance < 8;
//       }
//     );

//     console.log('Clicked point index:', clickedPointIndex);
//     setMouseDownTime(Date.now());

//     if (clickedPointIndex !== -1) {
//       event.preventDefault();
//       event.stopPropagation();
//       setSelectedPointIndex(clickedPointIndex);
//       console.log('Selected point:', clickedPointIndex);
//     } else {
//       // Clear selection if clicking elsewhere
//       setSelectedPointIndex(null);
//       setIsDragging(false);
//       setJustFinishedDragging(false);
//       console.log('Cleared selection');
//     }
//   }, [drawingMode, points]);

//   const handleMouseUp = useCallback((event) => {
//     console.log('Mouse up - isDragging:', isDragging, 'selectedPointIndex:', selectedPointIndex);
//     setMouseDownTime(null);
    
//     if (isDragging) {
//       event.preventDefault();
//       setIsDragging(false);
//       setJustFinishedDragging(true);
//       // Clear the flag after a short delay to allow the event to propagate
//       setTimeout(() => setJustFinishedDragging(false), 50);
//     }
//   }, [isDragging, selectedPointIndex]);

//   const handleContextMenu = useCallback((event) => {
//     if (!drawingMode || !wrapperRef.current) return;
    
//     event.preventDefault();
//     const rect = wrapperRef.current.getBoundingClientRect();
//     const x = ((event.clientX - rect.left) / rect.width) * 100;
//     const y = ((event.clientY - rect.top) / rect.height) * 100;

//     // Check if right-click is on an existing point
//     const clickedPointIndex = points.findIndex(
//       p => Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2)) < 8
//     );

//     if (clickedPointIndex !== -1 && points.length > 1) {
//       console.log('Removing point at index:', clickedPointIndex, 'total points:', points.length);
//       setPoints(prevPoints => {
//         const newPoints = prevPoints.filter((_, index) => index !== clickedPointIndex);
//         console.log('Points after right-click deletion:', newPoints.length);
//         return newPoints;
//       });
//       setSelectedPointIndex(null);
//       setIsDragging(false);
//       setJustFinishedDragging(false);
//     }
//   }, [drawingMode, points]);

//   const handleOverlayClick = useCallback((event) => {
//     if (!drawingMode || !wrapperRef.current) return;
    
//     // Don't add points if we're dragging or just finished dragging
//     if (isDragging || justFinishedDragging) {
//       console.log('Skipping overlay click - isDragging:', isDragging, 'justFinishedDragging:', justFinishedDragging);
//       return;
//     }
    
//     console.log('Overlay click');
//     const rect = wrapperRef.current.getBoundingClientRect();
//     const x = ((event.clientX - rect.left) / rect.width) * 100;
//     const y = ((event.clientY - rect.top) / rect.height) * 100;

//     // Clamp coordinates
//     const clampedX = Math.max(0, Math.min(100, x));
//     const clampedY = Math.max(0, Math.min(100, y));

//     // Check if click is near an existing point
//     const clickedPointIndex = points.findIndex(
//       p => Math.sqrt(Math.pow(clampedX - p.x, 2) + Math.pow(clampedY - p.y, 2)) < 8
//     );

//     // Only add new point if not clicking on existing point
//     if (clickedPointIndex === -1) {
//       console.log('Adding new point via overlay:', { x: clampedX, y: clampedY });
//       setPoints(prevPoints => {
//         const newPoints = [...prevPoints, { x: clampedX, y: clampedY }];
//         console.log('Points after adding:', newPoints.length);
//         return newPoints;
//       });
//     }
//   }, [drawingMode, isDragging, justFinishedDragging, points]);

//   // Form submission
//   const handleSubmit = async () => {
//     try {
//       const trimmedName = name.trim();

//       if (!trimmedName) {
//         alert('Tên vùng là bắt buộc.');
//         return;
//       }

//       const isDuplicateName = existingZones.some(
//         (z) => z.name === trimmedName && (!zone || z._id !== zone._id)
//       );

//       if (isDuplicateName) {
//         alert('Tên vùng phải là duy nhất.');
//         return;
//       }

//       const zoneData = {
//         cameraId,
//         name: trimmedName,
//         points,
//         countingDirection
//       };

//       if (zone) {
//         await axios.patch(`http://localhost:5008/api/zones/${zone._id}`, zoneData);
//       } else {
//         await axios.post('http://localhost:5008/api/zones', zoneData);
//       }

//       onClose();
//     } catch (error) {
//       console.error('Lỗi khi lưu vùng:', error);
//       alert('Lưu vùng thất bại. Vui lòng kiểm tra console để biết chi tiết.');
//     }
//   };

//   // Prepare zones for VideoPlayer (existing zones + current editing zone)
//   const displayZones = [
//     ...existingZones.filter(z => !zone || z._id !== zone._id),
//     ...(points.length > 0 ? [{ 
//       name: name || 'Vùng mới', 
//       points, 
//       countingDirection,
//       isEditing: true 
//     }] : [])
//   ];

//   return (
//     <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
//       <DialogTitle>{zone ? 'Chỉnh sửa vùng' : 'Thêm vùng mới'}</DialogTitle>
//       <DialogContent>
//         {!drawingMode && (
//           <>
//             <Box mb={2}>
//               <TextField
//                 label="Tên vùng"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 fullWidth
//                 margin="normal"
//                 error={existingZones.some(z => z.name === name && (!zone || z._id !== zone._id))}
//                 helperText={
//                   existingZones.some(z => z.name === name && (!zone || z._id !== zone._id))
//                     ? 'Tên vùng đã tồn tại'
//                     : ''
//                 }
//               />
//             </Box>

//             <Box mb={2}>
//               <Typography variant="subtitle1" gutterBottom>
//                 Hướng đếm
//               </Typography>
//               <Box display="flex" gap={2}>
//                 <Button
//                   variant={countingDirection === 'in' ? 'contained' : 'outlined'}
//                   onClick={() => setCountingDirection('in')}
//                 >
//                   Vào
//                 </Button>
//                 <Button
//                   variant={countingDirection === 'out' ? 'contained' : 'outlined'}
//                   onClick={() => setCountingDirection('out')}
//                 >
//                   Ra
//                 </Button>
//                 <Button
//                   variant={countingDirection === 'both' ? 'contained' : 'outlined'}
//                   onClick={() => setCountingDirection('both')}
//                 >
//                   Cả hai
//                 </Button>
//               </Box>
//             </Box>
//           </>
//         )}

//         <Box mb={2}>
//           <Paper elevation={3} sx={{ padding: 2, backgroundColor: drawingMode ? '#fffde7' : 'inherit' }}>
//             <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
//               <Typography variant="subtitle1" gutterBottom>
//                 {instructions}
//               </Typography>
//               <Box>
//                 <Button 
//                   variant="outlined" 
//                   size="small"
//                   onClick={() => {
//                     setDrawingMode(!drawingMode);
//                     setSelectedPointIndex(null);
//                     setIsDragging(false);
//                     setJustFinishedDragging(false);
//                   }}
//                 >
//                   {drawingMode ? 'Thoát vẽ' : 'Vào chế độ vẽ'}
//                 </Button>
//               </Box>
//             </Box>

//             {drawingMode && (
//               <Box display="flex" gap={2} mb={2} flexWrap="wrap">
//                 <Button variant="outlined" onClick={() => {
//                   setDrawingMode(false);
//                   setSelectedPointIndex(null);
//                   setIsDragging(false);
//                   setJustFinishedDragging(false);
//                 }}>
//                   Thoát chế độ vẽ (Esc)
//                 </Button>
//                 <Button
//                   variant="outlined"
//                   onClick={handleRemoveLastPoint}
//                   disabled={points.length === 0}
//                   color="warning"
//                 >
//                   Xóa điểm cuối (r)
//                 </Button>
//                 <Button
//                   variant="outlined"
//                   onClick={handleClearPoints}
//                   disabled={points.length === 0}
//                   color="error"
//                 >
//                   Xóa tất cả
//                 </Button>
//                 <Button
//                   variant="contained"
//                   onClick={handleClosePolygon}
//                   disabled={points.length < 3}
//                   color="success"
//                 >
//                   Hoàn thành vùng (d)
//                 </Button>
//                 {selectedPointIndex !== null && (
//                   <Button
//                     variant="outlined"
//                     onClick={() => {
//                       if (points.length > 1) {
//                         console.log('Deleting selected point via button:', selectedPointIndex);
//                         setPoints(prevPoints => {
//                           const newPoints = prevPoints.filter((_, index) => index !== selectedPointIndex);
//                           console.log('Points after button deletion:', newPoints.length);
//                           return newPoints;
//                         });
//                         setSelectedPointIndex(null);
//                         setIsDragging(false);
//                         setJustFinishedDragging(false);
//                       }
//                     }}
//                     color="error"
//                     size="small"
//                   >
//                     Xóa điểm {selectedPointIndex + 1} (Del)
//                   </Button>
//                 )}
//               </Box>
//             )}

//             <Box
//               ref={wrapperRef}
//               sx={{
//                 position: 'relative',
//                 paddingTop: '56.25%',
//                 border: '1px solid #ccc',
//                 marginBottom: 2,
//                 backgroundColor: 'black',
//                 cursor: drawingMode ? (isDragging ? 'grabbing' : 'crosshair') : 'default'
//               }}
//               onMouseMove={handleMouseMove}
//               onMouseDown={handleMouseDown}
//               onMouseUp={handleMouseUp}
//               onMouseLeave={handleMouseUp}
//               onContextMenu={handleContextMenu}
//             >
//               <div style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 width: '100%',
//                 height: '100%'
//               }}>
//                 <VideoPlayer
//                   camera={camera}
//                   zones={displayZones}
//                   showZones={true}
//                   onVideoClick={null} // Disable video click handling
//                   isDrawingMode={drawingMode}
//                   editingPoints={drawingMode ? points : []}
//                   selectedPointIndex={selectedPointIndex}
//                 />
                
//                 {/* Mouse interaction overlay */}
//                 {drawingMode && (
//                   <div 
//                     style={{
//                       position: 'absolute',
//                       top: 0,
//                       left: 0,
//                       width: '100%',
//                       height: '100%',
//                       zIndex: 10,
//                       cursor: isDragging ? 'grabbing' : 'crosshair'
//                     }}
//                     onClick={handleOverlayClick}
//                   />
//                 )}
//               </div>
//             </Box>

//             {drawingMode && (
//               <Typography variant="body2">
//                 Số điểm: {points.length} {points.length > 2 &&
//                   "(Nhấn 'd' để hoàn thành vùng)"}<br/>
//                 <small style={{ color: '#666' }}>
//                   💡 Mẹo: Nhấn chuột trái để thêm điểm, kéo để di chuyển, chuột phải để xóa điểm
//                 </small>
//               </Typography>
//             )}
//           </Paper>
//         </Box>

//         {!drawingMode && (
//           <Box mt={2}>
//             <Typography variant="subtitle1">Các vùng hiện có:</Typography>
//             {existingZones.map((existingZone, index) => (
//               <Box key={`zone-info-${index}`} display="flex" alignItems="center" mb={1}>
//                 <Box
//                   width={20}
//                   height={20}
//                   bgcolor="rgba(0, 255, 0, 0.3)"
//                   border="1px solid green"
//                   mr={1}
//                 />
//                 <Typography>
//                   {existingZone.name} ({existingZone.points.length} điểm) -
//                   Hướng đếm: {existingZone.countingDirection === 'in' ? 'Vào' :
//                     existingZone.countingDirection === 'out' ? 'Ra' : 'Cả hai'}
//                 </Typography>
//               </Box>
//             ))}
//           </Box>
//         )}
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose}>Hủy</Button>
//         <Button
//           onClick={handleSubmit}
//           variant="contained"
//           color="primary"
//           disabled={points.length < 3 || drawingMode}
//         >
//           Lưu vùng
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default ZoneEditor;
