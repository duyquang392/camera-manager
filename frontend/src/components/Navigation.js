import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const Navigation = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Camera Management
        </Typography>
        <Button color="inherit" component={Link} to="/cameras">
          Cameras
        </Button>
        <Button color="inherit" component={Link} to="/cameras/add">
          Add Camera
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;