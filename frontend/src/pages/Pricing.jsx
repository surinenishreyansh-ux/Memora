import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { Check, Zap, Crown, ShieldCheck } from 'lucide-react';

const Pricing = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data } = await api.get(`/events/${eventId}`);
        setEvent(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleSelectPlan = async (planType, price) => {
    setLoading(true);
    try {
      // 1. Mock payment success
      await api.post(`/memora/payment-success/${eventId}`, { planType, price });
      
      // 2. Automatically trigger AI processing
      await api.post(`/memora/process-event/${eventId}`);
      
      alert(`Payment of ₹${price} successful! AI processing has started.`);
      navigate(`/events/${eventId}`);
    } catch (err) {
      console.error(err);
      alert('Payment was successful, but AI processing failed to start. You can trigger it manually from the dashboard.');
      navigate(`/events/${eventId}`);
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      type: 'basic',
      name: 'Basic',
      price: '999',
      icon: <Zap className="w-8 h-8 text-blue-400" />,
      features: ['Up to 1,000 photos', 'AI face search enabled', 'Memora Branding', '24h support'],
      color: 'border-blue-500/20 hover:border-blue-500/50'
    },
    {
      type: 'pro',
      name: 'Pro',
      price: '2,999',
      icon: <Crown className="w-8 h-8 text-accent" />,
      features: ['Up to 5,000 photos', 'Instant face recognition results', 'White-label gallery', 'Priority support'],
      popular: true,
      color: 'border-accent/30 hover:border-accent shadow-xl shadow-accent/10'
    },
    {
      type: 'premium',
      name: 'Premium',
      price: '9,999',
      icon: <ShieldCheck className="w-8 h-8 text-purple-400" />,
      features: ['Up to 10,000 photos', 'Handle large weddings effortlessly', 'Custom branding', 'High-speed delivery', 'Personal account manager'],
      color: 'border-purple-500/20 hover:border-purple-500/50'
    }
  ];

  if (!event) return <div className="min-h-screen bg-studio-900 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-studio-900 text-white font-sans pb-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Select Your Plan</h1>
          <p className="text-xl text-gray-400">Unlock AI face sorting for <span className="text-white font-semibold">{event.name}</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.type}
              className={`relative glass-panel-dark p-8 rounded-3xl border-2 transition-all duration-300 flex flex-col ${plan.color}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-studio-900 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                {plan.icon}
                <h3 className="text-2xl font-bold mt-4">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold">₹{plan.price}</span>
                  <span className="text-gray-500 ml-2">/ event</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleSelectPlan(plan.type, plan.price)}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  plan.popular 
                  ? 'bg-accent text-studio-900 hover:bg-accent-light' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {loading ? 'Processing...' : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center p-10 glass-panel-dark rounded-3xl">
          <h3 className="text-2xl font-bold mb-4">Enterprise Event?</h3>
          <p className="text-gray-400 mb-6">Need <span className="text-white font-bold">Unlimited photos</span> for massive festivals or custom solutions?</p>
          <button className="text-accent hover:underline font-bold text-lg">Contact Sales for Custom Pricing</button>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
