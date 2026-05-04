import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { motion } from 'framer-motion';
import { Download, Share2, ArrowLeft, Trash2, Heart } from 'lucide-react';

const Results = () => {
  const { searchId } = useParams();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { data } = await api.get(`/ai/results/${searchId}`);
        setPhotos(data.photos);
      } catch (error) {
        setError('Your search session has expired or could not be found.');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [searchId]);

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'memora-photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed', error);
      // Fallback to opening in new tab
      window.open(url, '_blank');
    }
  };

  const handleDeleteSearch = async () => {
    if (confirm('This will clear your personal results from this session. Continue?')) {
      try {
        await api.delete(`/ai/search-data/${searchId}`);
        window.location.href = '/';
      } catch (error) {
        console.error(error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-studio-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white font-medium">Curating your memories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-studio-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel-dark p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Oops!</h2>
          <p className="text-gray-400 mb-8">{error}</p>
          <Link to="/" className="inline-block bg-accent text-studio-900 px-8 py-3 rounded-full font-bold">
            Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-studio-900 text-white font-sans pb-20">
      <header className="p-4 md:p-6 flex items-center justify-between border-b border-white/10 bg-studio-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Your Personal Gallery</h1>
        </div>
        <button 
          onClick={handleDeleteSearch}
          className="text-gray-400 hover:text-red-400 transition-colors p-2"
          title="Clear session data"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Heart className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Found {photos.length} Memories</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            These are the photos where our AI identified you. Download your favorites or share the gallery.
          </p>
        </motion.div>

        {photos.length === 0 ? (
          <div className="text-center py-20 glass-panel-dark">
            <p className="text-gray-400">No matching photos found. Try another photo or a different angle.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo, i) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                key={photo._id}
                className="group relative rounded-2xl overflow-hidden shadow-2xl bg-studio-800"
              >
                <img 
                  src={photo.imageUrl} 
                  alt="Matched memory" 
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Overlay with buttons */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                  <div className="flex items-center justify-between gap-3">
                    <button 
                      onClick={() => handleDownload(photo.imageUrl, `memora-${photo._id}.jpg`)}
                      className="flex-1 bg-white text-studio-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Download
                    </button>
                    <button 
                      className="p-3 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 transition-colors"
                      onClick={() => {
                        if (navigator.share) {
                           navigator.share({
                             title: 'My Memory',
                             url: photo.imageUrl
                           });
                        } else {
                           alert('Sharing is not supported in this browser. Image URL copied to clipboard.');
                           navigator.clipboard.writeText(photo.imageUrl);
                        }
                      }}
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Quality badge if high score */}
                {photo.qualityScore > 80 && (
                  <div className="absolute top-4 left-4 bg-accent/90 text-studio-900 text-xs font-bold px-2 py-1 rounded shadow-lg backdrop-blur-sm">
                    BEST SHOT
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-20 text-center">
          <p className="text-gray-500 text-sm mb-4">Memory session expires in 24 hours.</p>
          <button 
            onClick={() => window.print()} 
            className="text-accent hover:underline font-medium"
          >
            Print Gallery
          </button>
        </div>
      </main>
    </div>
  );
};

export default Results;
