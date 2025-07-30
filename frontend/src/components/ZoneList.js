import React from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  IconButton,
  Typography,
  Paper
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import axios from 'axios';


const ZoneList = ({ zones, onEdit, onDelete }) => {
  const handleDelete = async (zoneId) => {
    try {
      await axios.delete(`http://localhost:5008/api/zones/${zoneId}`);
      onDelete();
    } catch (error) {
      console.error('Error deleting zone:', error);
    }
  };

  if (zones.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>No zones defined for this camera.</Typography>
      </Paper>
    );
  }

  return (
    <List>
      {zones.map((zone) => (
        <ListItem 
          key={zone._id}
          secondaryAction={
            <>
              <IconButton edge="end" onClick={() => onEdit(zone)}>
                <Edit />
              </IconButton>
              <IconButton edge="end" onClick={() => handleDelete(zone._id)}>
                <Delete />
              </IconButton>
            </>
          }
        >
          <ListItemText
            primary={zone.name}
            secondary={`Points: ${zone.points.length}, Direction: ${zone.countingDirection}`}
          />
        </ListItem>
      ))}
    </List>
  );
};

export default ZoneList;