import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, Sparkles, Image as ImageIcon } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-studio-900 text-white overflow-hidden relative font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px]" />

      {/* Nav */}
      <nav className="relative z-10 px-8 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="Memora Logo" className="w-12 h-12 object-contain" />
          <span className="text-2xl font-bold tracking-tight">Memora</span>
        </div>
        <div className="space-x-4">
          <Link to="/login" className="px-5 py-2.5 text-sm font-medium hover:text-accent transition-colors">Studio Login</Link>
          <Link to="/register" className="px-5 py-2.5 text-sm font-medium bg-white text-studio-900 rounded-full hover:bg-gray-100 transition-colors">Create Account</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">AI-Powered Event Memory Platform</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-tight">
            Circle your face. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-200">
              Get your memories instantly.
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Photographers upload once. Guests get their personal event gallery instantly with our advanced facial recognition technology.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to="/register" className="px-8 py-4 bg-accent text-studio-900 rounded-full font-semibold text-lg hover:bg-accent-light transition-all transform hover:scale-105 flex items-center space-x-2 w-full sm:w-auto justify-center">
              <span>Start for Free</span>
            </Link>
            <Link to="/login" className="px-8 py-4 bg-white/10 text-white rounded-full font-semibold text-lg hover:bg-white/20 transition-all border border-white/10 flex items-center space-x-2 w-full sm:w-auto justify-center">
              <ImageIcon className="w-5 h-5" />
              <span>Studio Login</span>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Landing;
