import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { motion } from 'framer-motion';
import { Camera, Check } from 'lucide-react';

const GuestEvent = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [consentGiven, setConsentGiven] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data } = await api.get(`/events/public/${slug}`);
        setEvent(data);
        
        // Fetch public photos 
        const photosRes = await api.get(`/photos/${data._id}`);
        setPhotos(photosRes.data);
      } catch (error) {
        setError('Event not found or unavailable');
      }
    };
    fetchEvent();
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!event) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>;

  const handlePhotoSelect = (photo) => {
    if (!consentGiven) {
      alert('Please check the consent box to proceed.');
      return;
    }
    // Navigate to face selection, pass photo data in state
    navigate(`/event/${slug}/select/${photo._id}`, { state: { eventId: event._id, photo } });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-center sm:justify-start space-x-2">
          <Camera className="w-6 h-6 text-accent" />
          <span className="text-xl font-bold text-gray-900 tracking-tight">Memora</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">{event.name}</h1>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Find your personal event photos instantly. Select any photo below where you appear clearly.
          </p>

          <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start space-x-4 text-left">
            <div className="flex-shrink-0 mt-1">
              <div className={`w-6 h-6 rounded border flex items-center justify-center cursor-pointer transition-colors ${consentGiven ? 'bg-accent border-accent' : 'border-gray-300'}`} onClick={() => setConsentGiven(!consentGiven)}>
                {consentGiven && <Check className="w-4 h-4 text-white" />}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 cursor-pointer" onClick={() => setConsentGiven(!consentGiven)}>
                <span className="font-semibold text-gray-900">Consent required:</span> I agree to temporary facial recognition processing to find my photos. The crop data will be deleted after 24 hours.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Masonry-like grid for MVP, standard grid works too */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {photos.map((photo, i) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.05, 0.5) }}
              key={photo._id}
              className={`aspect-[3/4] rounded-xl overflow-hidden cursor-pointer relative group ${!consentGiven ? 'opacity-80' : ''}`}
              onClick={() => handlePhotoSelect(photo)}
            >
              <img src={photo.imageUrl} alt="Event" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                  <span className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium text-sm shadow-lg">
                    Select
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default GuestEvent;
