import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import UploadBox from '../components/UploadBox';
import { ArrowLeft, Copy, Cpu, ExternalLink, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchEventData = async () => {
    try {
      const [eventRes, photosRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/photos/${eventId}`)
      ]);
      setEvent(eventRes.data);
      setPhotos(photosRes.data);
    } catch (error) {
      console.error('Failed to fetch event details', error);
    }
  };

  useEffect(() => {
    fetchEventData();
    // Poll for status if processing
    let interval;
    if (event?.processingStatus === 'processing') {
      interval = setInterval(fetchEventData, 3000);
    }
    return () => clearInterval(interval);
  }, [eventId, event?.processingStatus]);

  const handleUpload = async (files) => {
    setUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));

    try {
      await api.post(`/memora/upload-event/${eventId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchEventData();
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleProcessAI = async () => {
    // Check if event is paid
    if (event.paymentStatus !== 'paid') {
      navigate(`/pricing/${eventId}`);
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/memora/process-event/${eventId}`);
      fetchEventData();
    } catch (error) {
      console.error('Processing failed', error);
      alert('Failed to start processing');
      setProcessing(false);
    }
  };

  const copyToClipboard = () => {
    const url = `${window.location.origin}/event/${event.publicSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!event) return <div className="min-h-screen bg-studio-900 flex items-center justify-center text-white">Loading...</div>;

  const publicLink = `${window.location.origin}/event/${event.publicSlug}`;

  return (
    <div className="min-h-screen bg-studio-900 text-white font-sans pb-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-2">{event.name}</h1>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">{new Date(event.date).toLocaleDateString()}</span>
              <span className={`px-2.5 py-1 rounded-full font-medium ${
                event.processingStatus === 'completed' ? 'bg-green-500/20 text-green-400' :
                event.processingStatus === 'processing' ? 'bg-accent/20 text-accent animate-pulse' :
                event.processingStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-300'
              }`}>
                Status: {event.processingStatus.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleProcessAI}
              disabled={photos.length === 0 || event.processingStatus === 'processing'}
              className="px-6 py-3 bg-accent text-studio-900 font-semibold rounded-xl hover:bg-accent-light transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Cpu className="w-5 h-5" />
              {event.processingStatus === 'processing' ? 'Processing...' : 'Process with AI'}
            </button>
            <button 
              onClick={async () => {
                if(confirm('Are you sure you want to delete this entire event and all photos?')) {
                  try {
                    await api.delete(`/events/${eventId}`);
                    window.location.href = '/dashboard';
                  } catch (err) {
                    alert('Failed to delete event');
                  }
                }
              }}
              className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
              title="Delete Event"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Public Link Card */}
        <div className="glass-panel-dark p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-accent" /> Guest Link
            </h3>
            <p className="text-sm text-gray-400">Share this link with guests so they can find their photos.</p>
          </div>
          <div className="flex w-full sm:w-auto bg-studio-900/50 rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 text-sm text-gray-300 overflow-x-auto whitespace-nowrap max-w-xs md:max-w-md">
              {publicLink}
            </div>
            <button 
              onClick={copyToClipboard}
              className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white transition-colors border-l border-white/10 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a 
              href={publicLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-accent text-studio-900 hover:bg-accent-light transition-colors border-l border-white/10 flex items-center gap-2 font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Open Link
            </a>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Upload Photos</h2>
          <UploadBox onUpload={handleUpload} />
          {uploading && (
            <div className="mt-4 flex items-center text-accent">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mr-3"></div>
              Uploading photos...
            </div>
          )}
        </div>

        {/* Photos Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Uploaded Photos ({photos.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={photo._id} 
                className="aspect-square bg-studio-800 rounded-xl overflow-hidden group relative"
              >
                <img src={photo.imageUrl} alt="event" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={async () => {
                      if(confirm('Delete photo?')) {
                        await api.delete(`/photos/${photo._id}`);
                        fetchEventData();
                      }
                    }}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventDetails;
