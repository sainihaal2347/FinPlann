import React, { useState } from 'react';
import { api } from '../utils/api';
import { Button } from '../components/SharedUI';
import { Zap, Loader2, ChevronRight } from 'lucide-react';

const LoginPage = ({ onAuthSuccess }) => {
  const [isReg, setIsReg] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    // Initialize Google Identity Services
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy_id_replace_me',
        callback: handleGoogleResponse
      });
      
      // Render the button into the container
      window.google.accounts.id.renderButton(
        document.getElementById("google-button-div"),
        { theme: "filled_black", size: "large", text: "continue_with", shape: "pill", width: 350 }
      );
    }
  }, []);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/google", { token: response.credential });
      if (res.token) {
        localStorage.setItem("token", res.token);
        onAuthSuccess();
      }
    } catch (err) {
      alert(`Google Login Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(isReg ? "/auth/register" : "/auth/login", form);
      if (res.token) {
        localStorage.setItem("token", res.token);
        onAuthSuccess();
      }
    } catch (err) {
      alert(`Backend Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl rounded-[30px] sm:rounded-[40px] p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 animate-fade-in relative z-10">
        <div className="text-center mb-8 sm:mb-10">
          <img src="/logo.png" alt="FinPlan AI" className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight italic">
            <span className="text-indigo-400">FinPlan</span> AI
          </h1>
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-3">Intelligence Simplified</div>
        </div>

        <div className="flex flex-col items-center mb-6 w-full">
          <div id="google-button-div" className="w-full flex justify-center min-h-[44px]"></div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-slate-900 text-slate-500 font-bold uppercase tracking-widest">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
            <input
              type="email"
              placeholder="name@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium shadow-inner"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium shadow-inner"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full py-3 sm:py-4 text-base sm:text-lg mt-4 group">
            {loading ? <Loader2 className="animate-spin" /> : <>{isReg ? "Create Account" : "Sign In"} <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
          </Button>
        </form>

        <button onClick={() => setIsReg(!isReg)} className="w-full mt-6 sm:mt-8 text-indigo-400 font-bold text-xs sm:text-sm hover:text-indigo-300 hover:underline transition-colors">
          {isReg ? "Already have an account? Sign In" : "New to FinPlan AI? Register Now"}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
