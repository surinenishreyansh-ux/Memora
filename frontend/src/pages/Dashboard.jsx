import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import EventCard from '../components/EventCard';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const { data } = await api.get('/events');
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-studio-900 text-white font-sans">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Studio Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage your events and memories.</p>
          </div>
          <Link 
            to="/create-event" 
            className="bg-accent text-studio-900 px-6 py-3 rounded-full font-semibold hover:bg-accent-light transition-colors flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>New Event</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-80 bg-studio-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="glass-panel-dark text-center py-20">
            <h3 className="text-xl font-medium mb-2">No events yet</h3>
            <p className="text-gray-400 mb-6">Create your first event to start uploading photos.</p>
            <Link to="/create-event" className="text-accent hover:underline">Create Event</Link>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {events.map(event => (
              <EventCard key={event._id} event={event} onRefresh={fetchEvents} />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
