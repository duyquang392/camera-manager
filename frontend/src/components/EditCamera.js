import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Container, 
  Typography, 
  Box 
} from '@mui/material';
import axios from 'axios';

const EditCamera = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const fetchCamera = async () => {
      try {
        const response = await axios.get(`http://localhost:5008/api/cameras/${id}`);
        setName(response.data.name);
        setStreamUrl(response.data.streamUrl);
        setDescription(response.data.description);
      } catch (error) {
        console.error('Error fetching camera:', error);
      }
    };

    fetchCamera();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`http://localhost:5008/api/cameras/${id}`, {
        name,
        streamUrl,
        description
      });
      navigate(`/cameras/${id}`);
    } catch (error) {
      console.error('Error updating camera:', error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={4}>
        <Typography variant="h4" gutterBottom>Edit Camera</Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Camera Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Stream URL (RTSP/HTTP)"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={4}
          />
          <Box mt={2}>
            <Button type="submit" variant="contained" color="primary">
              Update Camera
            </Button>
          </Box>
        </form>
      </Box>
    </Container>
  );
};

export default EditCamera;