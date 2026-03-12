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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-gray-100 animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-indigo-200">
            <Zap size={32} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isReg ? "Join FinPlan" : "Welcome Back"}
          </h1>
          <p className="text-slate-500 font-medium mt-2">MongoDB & FastAPI Edition</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
            <input 
              type="email" 
              placeholder="name@email.com" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})} 
              className="w-full p-4 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 transition-all" 
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={form.password} 
              onChange={e => setForm({...form, password: e.target.value})} 
              className="w-full p-4 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 transition-all" 
              required 
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full py-4 text-lg">
            {loading ? <Loader2 className="animate-spin" /> : <>{isReg ? "Create Account" : "Sign In"} <ChevronRight size={20} /></>}
          </Button>
        </form>
        
        <button onClick={() => setIsReg(!isReg)} className="w-full mt-6 text-indigo-600 font-bold text-sm hover:underline">
          {isReg ? "Already have an account? Sign In" : "New to FinPlan AI? Register Now"}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
