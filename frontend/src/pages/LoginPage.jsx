import React, { useState } from 'react';
import { api } from '../utils/api';
import { Button } from '../components/SharedUI';
import { Zap, Loader2, ChevronRight } from 'lucide-react';

const LoginPage = ({ onAuthSuccess }) => {
  const [isReg, setIsReg] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

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

      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl rounded-[40px] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 animate-fade-in relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-[0_0_30px_rgba(99,102,241,0.5)] border border-indigo-400/20">
            <Zap size={32} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {isReg ? "Join FinPlan" : "Welcome Back"}
          </h1>
          <p className="text-slate-400 font-medium mt-2">MongoDB & FastAPI Edition</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
            <input 
              type="email" 
              placeholder="name@email.com" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})} 
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
              onChange={e => setForm({...form, password: e.target.value})} 
              className="w-full p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium shadow-inner" 
              required 
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full py-4 text-lg mt-4 group">
            {loading ? <Loader2 className="animate-spin" /> : <>{isReg ? "Create Account" : "Sign In"} <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
          </Button>
        </form>
        
        <button onClick={() => setIsReg(!isReg)} className="w-full mt-8 text-indigo-400 font-bold text-sm hover:text-indigo-300 hover:underline transition-colors">
          {isReg ? "Already have an account? Sign In" : "New to FinPlan AI? Register Now"}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
