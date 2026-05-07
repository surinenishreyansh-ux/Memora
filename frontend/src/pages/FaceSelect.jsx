import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import FaceSelectorCanvas from '../components/FaceSelectorCanvas';
import { motion } from 'framer-motion';
import { ArrowLeft, UserCircle } from 'lucide-react';

const FaceSelect = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [faceBlob, setFaceBlob] = useState(null);
  const [loading, setLoading] = useState(false);

  const { eventId, photo } = location.state || {};

  useEffect(() => {
    if (!photo) {
      navigate(`/event/${slug}`);
    }
  }, [photo, slug, navigate]);

  if (!photo) return null;

  const handleSearch = async () => {
    if (!faceBlob) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('faceCrop', faceBlob, 'crop.jpg');
      formData.append('selectedPhotoId', photo._id);

      const { data } = await api.post(`/memora/search-face/${eventId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (data.matched) {
        navigate(`/results/direct`, { state: { photos: data.photos, eventId } });
      } else {
        alert(data.message || 'No matching photos found.');
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to find matching photos. Please try another photo or re-select your face.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-studio-900 text-white font-sans flex flex-col">
      <header className="p-4 md:p-6 flex items-center border-b border-white/10 bg-studio-900/80 backdrop-blur-md sticky top-0 z-50">
        <Link to={`/event/${slug}`} className="flex items-center text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="font-medium">Back to Gallery</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 flex items-center justify-center gap-2 sm:gap-3">
            <UserCircle className="w-8 h-8 text-accent" />
            Where are you?
          </h1>
          <p className="text-gray-400 max-w-md mx-auto">
            Draw a circle around your face to let our AI find your personal gallery instantly.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md mx-auto mb-8"
        >
          <FaceSelectorCanvas 
            imageUrl={photo.imageUrl} 
            onCrop={(blob) => setFaceBlob(blob)} 
          />
        </motion.div>

        <div className="h-16 flex items-center justify-center w-full max-w-md mx-auto">
          {faceBlob ? (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-accent text-studio-900 py-4 px-8 rounded-full font-bold text-lg hover:bg-accent-light transition-colors shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-studio-900 border-t-transparent rounded-full animate-spin" />
                  Finding your memories...
                </>
              ) : (
                'Find My Photos'
              )}
            </motion.button>
          ) : (
            <p className="text-gray-500 italic text-sm">Please select your face to continue</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default FaceSelect;
