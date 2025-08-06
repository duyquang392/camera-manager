import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from '@mui/material';
import CameraList from './components/CameraList';
import CameraDetail from './components/CameraDetail';
// import AddCamera from './components/AddCamera';
import AddCameraPage from './components/AddCameraPage';
import EditCamera from './components/EditCamera';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <Navigation />
      <Container>
        <Routes>
          <Route path="/" element={<CameraList />} />
          <Route path="/cameras" element={<CameraList />} />
          <Route path="/cameras/add" element={<AddCameraPage />} />
          <Route path="/cameras/:id" element={<CameraDetail />} />
          <Route path="/cameras/:id/edit" element={<EditCamera />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;