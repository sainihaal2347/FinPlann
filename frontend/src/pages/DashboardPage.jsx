import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/SharedUI';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api } from '../utils/api';
import { Plus, X, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

const DashboardPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    type: 'income',
    amount: '',
    label: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/user/transactions');
      if (Array.isArray(res)) setTransactions(res);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.label) return;
    setIsSubmitting(true);
    try {
      await api.post('/user/transactions', {
        type: form.type,
        amount: parseFloat(form.amount),
        label: form.label,
        date: new Date().toISOString()
      });
      setShowModal(false);
      setForm({ type: 'income', amount: '', label: '' });
      fetchData();
    } catch (err) {
      alert("Failed to save transaction: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate KPIs
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Format data for charts (group by day)
  const chartDataMap = {};
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Initialize last 7 days empty
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    chartDataMap[d.toISOString().split('T')[0]] = { name: days[d.getDay()], income: 0, expense: 0, sortKey: d.getTime() };
  }

  // Populate data
  transactions.forEach(t => {
    const dStr = t.date ? t.date.split('T')[0] : t.created_at?.split('T')[0];
    if (dStr && chartDataMap[dStr]) {
      chartDataMap[dStr][t.type] += t.amount;
    }
  });

  const activityData = Object.values(chartDataMap).sort((a,b) => a.sortKey - b.sortKey);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Overview</h2>
          <p className="text-slate-400 mt-2">Welcome back! Here's your financial summary.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchData} className="!p-3 border-slate-700 hover:bg-slate-800">
            <RefreshCw size={20} className={loading ? "animate-spin text-indigo-400" : "text-slate-400"} />
          </Button>
          <Button onClick={() => setShowModal(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus size={20} /> Add Record
          </Button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Net Savings" className="border-t-4 border-t-indigo-500">
          <h3 className="text-4xl font-black text-white">₹{netSavings.toLocaleString()}</h3>
          <p className={`text-sm font-bold mt-2 ${netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netSavings >= 0 ? '+' : ''}{netSavings > 0 ? 'Surplus' : netSavings < 0 ? 'Deficit' : 'Balanced'}
          </p>
        </Card>
        <Card title="Total Income" className="border-t-4 border-t-emerald-500">
          <h3 className="text-4xl font-black text-white">₹{totalIncome.toLocaleString()}</h3>
          <p className="text-emerald-400 text-sm font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={14}/> Recorded Income</p>
        </Card>
        <Card title="Total Expense" className="border-t-4 border-t-rose-500">
          <h3 className="text-4xl font-black text-white">₹{totalExpense.toLocaleString()}</h3>
          <p className="text-rose-400 text-sm font-bold mt-2 flex items-center gap-1"><ArrowDownRight size={14}/> Recorded Expenses</p>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="7-Day Cash Flow Activity" className="lg:col-span-2 min-h-[400px]">
          {transactions.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl mt-4">No activity yet. Click 'Add Record' to start tracking.</div>
          ) : (
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => [`₹${value}`, '']}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Expense Breakdown" className="min-h-[400px]">
          {transactions.filter(t => t.type === 'expense').length === 0 ? (
             <div className="h-[300px] flex items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl mt-4 text-sm text-center px-4">No expenses recorded in the last 7 days.</div>
          ) : (
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val >= 1000 ? val/1000+'k' : val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    cursor={{fill: '#1e293b', opacity: 0.4}}
                    formatter={(value) => [`₹${value}`, 'Expense']}
                  />
                  <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-md border-slate-700 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-white mb-6">Log Record</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950 rounded-xl">
                <button
                  type="button"
                  onClick={() => setForm({...form, type: 'income'})}
                  className={`py-2 px-4 rounded-lg font-bold transition-colors ${form.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                >Income</button>
                <button
                  type="button"
                  onClick={() => setForm({...form, type: 'expense'})}
                  className={`py-2 px-4 rounded-lg font-bold transition-colors ${form.type === 'expense' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
                >Expense</button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0.00" 
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-xl font-medium"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Label / Description</label>
                <input 
                  type="text" 
                  placeholder={form.type === 'income' ? "e.g., Salary, Freelance" : "e.g., Groceries, Rent"} 
                  value={form.label}
                  onChange={e => setForm({...form, label: e.target.value})}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full py-4 text-lg mt-4 bg-indigo-600 hover:bg-indigo-500">
                {isSubmitting ? 'Saving...' : 'Save Record'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
