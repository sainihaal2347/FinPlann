import React, { useState, useEffect } from 'react';
import { Card, ProgressBar, Button } from '../components/SharedUI';
import { api } from '../utils/api';
import { Plus, Target, RefreshCw, Edit3, Trash2, X } from 'lucide-react';

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  
  const [newGoal, setNewGoal] = useState({
    title: '',
    target: '',
    color: '#6366f1', // default indigo-500
    target_date: '',
    category: '🎯'
  });

  const [editData, setEditData] = useState({
    title: '',
    target: '',
    addAmount: '',
    color: '',
    target_date: '',
    category: '🎯'
  });

  const fetchGoals = () => {
    setLoading(true);
    api.get('/user/goals')
      .then(res => {
        if (Array.isArray(res)) setGoals(res);
      })
      .catch(err => console.error("Error fetching goals:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchGoals();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if(!newGoal.title || !newGoal.target) return;
    
    try {
      await api.post('/user/goals', {
        title: newGoal.title,
        target: parseFloat(newGoal.target),
        current: 0,
        color: newGoal.color,
        target_date: newGoal.target_date || null,
        category: newGoal.category || '🎯'
      });
      setIsCreating(false);
      setNewGoal({ title: '', target: '', color: '#6366f1', target_date: '', category: '🎯' });
      fetchGoals();
    } catch (err) {
      alert("Failed to create goal: " + err.message);
    }
  };

  const handleDelete = async (goalId) => {
    if(!window.confirm("Are you sure you want to delete this goal?")) return;
    try {
      await api.delete(`/user/goals/${goalId}`);
      fetchGoals();
    } catch (err) {
      alert("Failed to delete goal: " + err.message);
    }
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setEditData({
      title: goal.title,
      target: goal.target,
      addAmount: '', // Empty by default
      color: goal.color || '#6366f1',
      target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
      category: goal.category || '🎯'
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: editData.title,
        target: parseFloat(editData.target),
        color: editData.color,
        target_date: editData.target_date || null,
        category: editData.category
      };
      if (editData.addAmount) {
        payload.add_amount = parseFloat(editData.addAmount);
      }
      
      await api.put(`/user/goals/${editingGoal.id || editingGoal._id}`, payload);
      setEditingGoal(null);
      fetchGoals();
    } catch (err) {
      alert("Failed to update goal: " + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Financial Goals</h2>
          <p className="text-slate-400 mt-2">Track and manage your saving targets.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchGoals} className="!p-3 border-slate-700 hover:bg-slate-800">
            <RefreshCw size={20} className={loading && goals.length ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => setIsCreating(!isCreating)} className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus size={20} /> {isCreating ? 'Cancel' : 'New Goal'}
          </Button>
        </div>
      </div>

      {isCreating && (
        <Card title="Create New Goal" className="border-indigo-500/30 bg-indigo-500/5 animate-fade-in mb-8">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Icon</label>
                  <input type="text" value={newGoal.category} onChange={e => setNewGoal({...newGoal, category: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-center text-xl" maxLength="2" required />
                </div>
                <div className="space-y-2 md:col-span-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Goal Name</label>
                  <input type="text" placeholder="e.g., Emergency Fund" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Target (₹)</label>
                  <input type="number" placeholder="0.00" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Target Date</label>
                  <input type="date" value={newGoal.target_date} onChange={e => setNewGoal({...newGoal, target_date: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:filter-invert" />
                </div>
            </div>
            <div className="flex gap-2 justify-end">
              <input type="color" value={newGoal.color} onChange={e => setNewGoal({...newGoal, color: e.target.value})} title="Theme Color" className="h-[50px] w-full max-w-[60px] cursor-pointer rounded-xl bg-slate-900 border border-slate-700 p-1" />
              <Button type="submit" className="w-[150px] py-3 bg-indigo-600 hover:bg-indigo-500">Save Goal</Button>
            </div>
          </form>
        </Card>
      )}

      {loading && goals.length === 0 ? (
        <div className="text-center py-20 text-slate-500 flex flex-col items-center">
          <Target size={48} className="mb-4 opacity-20" />
          <p>Loading your financial goals...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
            const gid = goal.id || goal._id;
            
            // Computations
            const targetDate = goal.target_date ? new Date(goal.target_date) : null;
            const daysRemaining = targetDate ? Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
            const monthsRemaining = daysRemaining && daysRemaining > 0 ? Math.max(1, daysRemaining / 30) : null;
            const monthlySaving = monthsRemaining ? ((goal.target - goal.current) / monthsRemaining).toFixed(0) : null;
            const isCompleted = goal.current >= goal.target;
            const isOverdue = daysRemaining !== null && daysRemaining < 0 && !isCompleted;

            let statusBadge = null;
            if (isCompleted) {
              statusBadge = <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-md font-bold ml-2 shrink-0">Completed 🎉</span>;
            } else if (isOverdue) {
              statusBadge = <span className="bg-rose-500/20 text-rose-400 text-[10px] px-2 py-1 rounded-md font-bold ml-2 shrink-0">Overdue</span>;
            } else if (daysRemaining !== null) {
              statusBadge = <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-1 rounded-md font-bold ml-2 shrink-0">{daysRemaining} days left</span>;
            }

            return (
            <Card key={gid} className="hover:-translate-y-1 transition-transform duration-300 relative group flex flex-col h-full">
              
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">{goal.category || '🎯'}</span>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white flex items-center flex-wrap gap-y-1">
                      {goal.title}
                      {statusBadge}
                    </h3>
                  </div>
                </div>
                
                <div className="flex gap-2 shrink-0 ml-2">
                  <button 
                    onClick={() => openEditModal(goal)}
                    className="p-2 rounded-lg bg-slate-800/80 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(gid)}
                    className="p-2 rounded-lg bg-slate-800/80 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 mt-auto">
                <div className="flex items-end justify-between mt-4">
                  <div>
                    <p className="text-3xl font-black" style={{ color: goal.color || '#f8fafc'}} >
                      ₹{goal.current.toLocaleString()}
                    </p>
                    <p className="text-slate-500 text-sm font-bold mt-1">of ₹{goal.target.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-slate-800 text-slate-300 border border-slate-700 mb-2">
                      {Math.round((goal.current / goal.target) * 100)}%
                    </span>
                  </div>
                </div>
                <ProgressBar current={goal.current} target={goal.target} color={goal.color || "#6366f1"} />
                
                {monthlySaving && !isCompleted && !isOverdue && (
                  <div className="pt-4 mt-4 border-t border-slate-800/50 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Suggested Saving</span>
                    <span className="text-sm font-bold text-slate-200">₹{parseFloat(monthlySaving).toLocaleString()} / mo</span>
                  </div>
                )}
              </div>
            </Card>
          )})}
          
          {goals.length === 0 && !isCreating && (
            <div className="col-span-full text-center py-20 text-slate-500 flex flex-col items-center bg-slate-900/50 rounded-[24px] border border-slate-800 border-dashed">
              <Target size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium text-slate-400">No goals currently found.</p>
              <p className="text-sm mt-2">Click "New Goal" above to start tracking your dreams.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-md border-slate-700 shadow-2xl relative">
            <button onClick={() => setEditingGoal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-white mb-6">Manage Goal</h3>
            
            <form onSubmit={handleUpdate} className="space-y-5">
              
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest ml-1">Deposit Funds (₹)</label>
                <p className="text-sm text-slate-400 mb-2">Add to the current balance of ₹{editingGoal.current?.toLocaleString()}</p>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={editData.addAmount}
                  onChange={e => setEditData({...editData, addAmount: e.target.value})}
                  className="w-full p-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="space-y-2 md:col-span-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Icon</label>
                  <input type="text" value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-center text-xl" maxLength="2" required />
                </div>
                <div className="space-y-2 md:col-span-9">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Goal Name</label>
                  <input type="text" value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div className="space-y-2 md:col-span-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Target (₹)</label>
                  <input type="number" value={editData.target} onChange={e => setEditData({...editData, target: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div className="space-y-2 md:col-span-5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Target Date</label>
                  <input type="date" value={editData.target_date} onChange={e => setEditData({...editData, target_date: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:filter-invert" />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Color</label>
                  <input type="color" value={editData.color} onChange={e => setEditData({...editData, color: e.target.value})} className="h-[50px] w-full cursor-pointer rounded-xl bg-slate-900 border border-slate-700 p-1" />
                </div>
              </div>

              <Button type="submit" className="w-full py-4 text-lg mt-4 bg-indigo-600 hover:bg-indigo-500">
                Update Goal
              </Button>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};

export default GoalsPage;
