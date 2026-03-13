import React, { useState, useEffect } from 'react';
import { Card, Button, ProgressBar } from '../components/SharedUI';
import { PiggyBank, Target, Flame, Plus, ChevronRight, X, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState([]);
  const [safeToSpend, setSafeToSpend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: 'Groceries', limit: 0 });

  const categories = [
    'Food & Dining', 
    'Groceries & Supermarkets', 
    'Peer-to-Peer (P2P)', 
    'Fuel & Auto', 
    'Health & Pharmacy', 
    'Transport / Cab', 
    'Entertainment', 
    'Financial / Credit Card / Loan', 
    'Shopping / E-commerce', 
    'Utilities & Telecom', 
    'Uncategorized',
    'General',
    'Other'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetsData, stsData] = await Promise.all([
        api.get('/user/budgets'),
        api.get('/user/safe-to-spend')
      ]);
      setBudgets(budgetsData);
      setSafeToSpend(stsData);
    } catch (err) {
      console.error("Failed to fetch budgeting data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/user/budgets', newBudget);
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      alert("Failed to save budget: " + err.message);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm("Are you sure you want to delete this budget?")) return;
    try {
      await api.delete(`/user/budgets/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete budget: " + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Monthly Budgets</h2>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">Set limits for categories and track your "Safe to Spend" allowance.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm px-3 sm:px-6">
          <Plus size={18} /> <span>Set Budget</span>
        </Button>
      </div>

      {safeToSpend && safeToSpend.total_monthly_limit > 0 && (
         <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none -mr-32 -mt-32"></div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
               <div className="text-center md:text-left">
                  <p className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px] sm:text-xs mb-2">Safe to Spend Today</p>
                  <h2 className="text-5xl sm:text-6xl font-black text-white">₹{safeToSpend.safe_to_spend_today.toLocaleString()}</h2>
                  <p className="text-slate-400 mt-3 text-xs sm:text-sm font-medium italic">Adjusts daily based on your actual spending.</p>
               </div>
               <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                  <div className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800">
                     <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Remaining</p>
                     <p className="text-xl font-bold text-white">₹{safeToSpend.remaining_month_budget.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800">
                     <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Spent</p>
                     <p className="text-xl font-bold text-white">₹{safeToSpend.spent_this_month.toLocaleString()}</p>
                  </div>
               </div>
            </div>
         </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.map(b => (
          <Card key={b.id} className="group overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                    <PiggyBank size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-white">{b.category}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monthly Limit</p>
                 </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 text-right">
                <button 
                  onClick={() => handleDeleteBudget(b.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 transition-all -mt-2 -mr-2"
                  title="Remove Budget"
                >
                  <X size={20} />
                </button>
                <p className="text-2xl font-black text-white">₹{b.limit.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="bg-slate-900/50 p-6 rounded-[24px] border border-slate-800/50">
               <div className="flex justify-between text-xs font-bold mb-3">
                  <span className="text-slate-500 uppercase tracking-wider">
                     {b.spent > b.limit ? 'Over Budget' : 'Budget Status'}
                  </span>
                  <span className={b.spent > b.limit ? 'text-rose-400' : 'text-indigo-400'}>
                     ₹{b.spent.toLocaleString()} / ₹{b.limit.toLocaleString()}
                  </span>
               </div>
               <ProgressBar 
                  progress={Math.min(100, (b.spent / b.limit) * 100)} 
                  color={b.spent > b.limit ? '#f43f5e' : '#6366f1'} 
                  className="h-2" 
               />
               <p className="text-[10px] font-bold text-slate-500 mt-3 uppercase tracking-tighter">
                  {b.spent >= b.limit 
                    ? `Overspent by ₹${(b.spent - b.limit).toLocaleString()}` 
                    : `₹${(b.limit - b.spent).toLocaleString()} remaining this month`}
               </p>
            </div>
          </Card>
        ))}

        {!loading && budgets.length === 0 && (
          <div className="md:col-span-2 py-20 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[32px] flex flex-col items-center justify-center text-slate-600">
            <Target size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-bold">No budgets active</p>
            <p className="text-sm text-center px-10">Specify monthly limits for your expense categories to see your Daily Safe-to-Spend amount.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-sm border-slate-700 shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-white mb-6 underline decoration-indigo-500 decoration-4 underline-offset-8">Category Budget</h3>
            
            <form onSubmit={handleSaveBudget} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Select Category</label>
                <select 
                  value={newBudget.category}
                  onChange={e => setNewBudget({...newBudget, category: e.target.value})}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Monthly Limit (₹)</label>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="e.g. 5000" 
                  value={newBudget.limit}
                  onChange={e => setNewBudget({...newBudget, limit: parseFloat(e.target.value) || 0})}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-xl font-medium"
                  required
                />
              </div>

              <div className="bg-indigo-500/10 p-4 rounded-2xl flex items-start gap-3 border border-indigo-500/20">
                 <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                 <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Setting a limit for this category will automatically update your overall **Safe-to-Spend** calculation on the dashboard.
                 </p>
              </div>

              <Button type="submit" className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-500">
                Update Budget
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
