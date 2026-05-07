import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Camera, LogOut, Settings } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-studio-900 border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
            <img 
              src="/logo.png" 
              alt="Memora Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain" 
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div style={{ display: 'none' }}>
              <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">Memora</span>
          </Link>
          
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 text-sm hidden sm:block">{user.name}</span>
              <Link to="/settings" className="text-gray-400 hover:text-white transition-colors" title="Settings">
                <Settings className="w-5 h-5" />
              </Link>
              <button 
                onClick={logout}
                className="text-gray-400 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
