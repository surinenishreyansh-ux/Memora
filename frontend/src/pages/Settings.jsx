import { useState, useContext, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import { Save, User, Shield, Sliders, Bell, Check, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('profile');
  
  // States
  const [studioName, setStudioName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [tolerance, setTolerance] = useState(0.55);
  const [notifCompletion, setNotifCompletion] = useState(true);
  const [notifUpload, setNotifUpload] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setStudioName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'ai', label: 'AI Config', icon: <Sliders className="w-5 h-5" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-studio-900 text-white font-sans">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Manage your studio identity, security, and AI preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-2">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-medium ${
                  activeTab === tab.id 
                  ? 'bg-accent text-studio-900 shadow-lg shadow-accent/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSave} className="glass-panel-dark p-10 rounded-3xl min-h-[500px] flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1"
                >
                  {/* PROFILE TAB */}
                  {activeTab === 'profile' && (
                    <div className="space-y-8">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <User className="text-accent" /> Studio Profile
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-3">Studio Name</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={studioName}
                              onChange={(e) => setStudioName(e.target.value)}
                              className="w-full bg-studio-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-accent transition-all pl-12"
                            />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-3">Professional Email</label>
                          <div className="relative">
                            <input 
                              type="email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-studio-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-accent transition-all pl-12"
                            />
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl">
                        <p className="text-blue-400 text-sm leading-relaxed">
                          Your studio name is displayed on all guest-facing galleries and the download ZIP filenames.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AI CONFIG TAB */}
                  {activeTab === 'ai' && (
                    <div className="space-y-10">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Sliders className="text-accent" /> AI Engine Configuration
                      </h3>
                      
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <label className="text-lg font-medium">Face Match Tolerance</label>
                          <div className="bg-accent text-studio-900 px-4 py-1 rounded-full font-bold text-sm">
                            {tolerance}
                          </div>
                        </div>
                        <input 
                          type="range" 
                          min="0.3" 
                          max="0.8" 
                          step="0.01" 
                          value={tolerance}
                          onChange={(e) => setTolerance(parseFloat(e.target.value))}
                          className="w-full accent-accent h-3 bg-studio-800 rounded-2xl appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                          <div className="text-center">
                            <span className="block text-white mb-1">STRICT</span>
                            High Accuracy
                          </div>
                          <div className="text-center">
                            <span className="block text-white mb-1">BALANCED</span>
                            Default
                          </div>
                          <div className="text-center">
                            <span className="block text-white mb-1">LOOSE</span>
                            More Matches
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                          <h4 className="font-bold mb-2">Detection Strategy</h4>
                          <p className="text-sm text-gray-400">Using DLIB-CNN for enterprise-grade detection.</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                          <h4 className="font-bold mb-2">Clustering Logic</h4>
                          <p className="text-sm text-gray-400">Chinese Whispers Graph-based grouping active.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECURITY TAB */}
                  {activeTab === 'security' && (
                    <div className="space-y-8">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Shield className="text-accent" /> Security Settings
                      </h3>
                      <div className="space-y-6">
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-400 mb-3">Current Password</label>
                          <div className="relative">
                            <input 
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="w-full bg-studio-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-accent transition-all pl-12"
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          </div>
                        </div>
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-400 mb-3">New Password</label>
                          <div className="relative">
                            <input 
                              type={showPassword ? "text" : "password"}
                              placeholder="Min. 8 characters"
                              className="w-full bg-studio-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-accent transition-all pl-12"
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <button 
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <button type="button" className="text-accent text-sm hover:underline font-medium">
                        Two-Factor Authentication (Coming Soon)
                      </button>
                    </div>
                  )}

                  {/* NOTIFICATIONS TAB */}
                  {activeTab === 'notifications' && (
                    <div className="space-y-10">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Bell className="text-accent" /> Notification Preferences
                      </h3>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 group cursor-pointer" onClick={() => setNotifCompletion(!notifCompletion)}>
                          <div>
                            <h4 className="font-bold mb-1">Processing Completed</h4>
                            <p className="text-sm text-gray-400">Receive an email when AI face sorting is finished.</p>
                          </div>
                          <div className={`w-14 h-8 rounded-full transition-all relative ${notifCompletion ? 'bg-accent' : 'bg-gray-700'}`}>
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${notifCompletion ? 'left-7' : 'left-1'}`}></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 group cursor-pointer" onClick={() => setNotifUpload(!notifUpload)}>
                          <div>
                            <h4 className="font-bold mb-1">Guest Activity</h4>
                            <p className="text-sm text-gray-400">Get notified when a guest finds their memories.</p>
                          </div>
                          <div className={`w-14 h-8 rounded-full transition-all relative ${notifUpload ? 'bg-accent' : 'bg-gray-700'}`}>
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${notifUpload ? 'left-7' : 'left-1'}`}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-auto pt-10 border-t border-white/10 flex items-center justify-between">
                <p className="text-xs text-gray-500 max-w-md">
                  Certain changes may take a few minutes to propagate across all global gallery links.
                </p>
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-accent text-studio-900 font-bold px-10 py-4 rounded-2xl flex items-center gap-3 hover:bg-accent-light transition-all disabled:opacity-50 min-w-[180px] justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-studio-900 border-t-transparent rounded-full animate-spin"></div>
                  ) : saved ? (
                    <>
                      <Check className="w-5 h-5" /> Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
