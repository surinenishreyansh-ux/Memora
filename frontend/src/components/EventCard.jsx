import { Link } from 'react-router-dom';
import { Calendar, Image as ImageIcon, ChevronRight, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';

const EventCard = ({ event, onRefresh }) => {
  const statusColors = {
    pending: 'bg-gray-500/20 text-gray-300',
    processing: 'bg-accent/20 text-accent animate-pulse',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="glass-panel-dark overflow-hidden flex flex-col group relative"
    >
      <div className="h-48 bg-studio-700 relative overflow-hidden">
        {event.coverImageUrl ? (
          <img 
            src={event.coverImageUrl} 
            alt={event.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-studio-900/90 to-transparent" />
        <div className={`absolute top-4 right-4 px-3 py-1 text-xs font-medium rounded-full ${statusColors[event.processingStatus]}`}>
          {event.processingStatus.charAt(0).toUpperCase() + event.processingStatus.slice(1)}
        </div>
      </div>

      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-bold mb-2">{event.name}</h3>
        <div className="flex items-center text-gray-400 text-sm mb-6">
          <Calendar className="w-4 h-4 mr-2" />
          {new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>

        <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
          <Link 
            to={`/events/${event._id}`} 
            className="text-accent hover:text-accent-light text-sm font-medium flex items-center transition-colors"
          >
            Manage Event <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
          <div className="flex items-center gap-3">
             <button 
              onClick={async (e) => {
                e.preventDefault();
                if(confirm(`Are you sure you want to delete "${event.name}"? This will remove all photos and AI data.`)) {
                  try {
                    await api.delete(`/events/${event._id}`);
                    if(onRefresh) onRefresh();
                  } catch (err) {
                    alert('Failed to delete event');
                  }
                }
              }}
              className="p-2 text-gray-500 hover:text-red-500 transition-colors"
              title="Delete Event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500">
              {event.publicSlug}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EventCard;
