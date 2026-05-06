import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import EventDetails from './pages/EventDetails';
import GuestEvent from './pages/GuestEvent';
import FaceSelect from './pages/FaceSelect';
import Results from './pages/Results';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Guest Flow */}
          <Route path="/event/:slug" element={<GuestEvent />} />
          <Route path="/event/:slug/select/:photoId" element={<FaceSelect />} />
          <Route path="/results/:searchId" element={<Results />} />

          {/* Studio Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/create-event" element={
            <ProtectedRoute><CreateEvent /></ProtectedRoute>
          } />
          <Route path="/events/:eventId" element={
            <ProtectedRoute><EventDetails /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          <Route path="/pricing/:eventId" element={
            <ProtectedRoute><Pricing /></ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
