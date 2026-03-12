import React, { useState, useEffect } from 'react';
import { Card, ProgressBar, Button } from '../components/SharedUI';
import { api } from '../utils/api';
import { Plus, Target, RefreshCw } from 'lucide-react';

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [newGoal, setNewGoal] = useState({
    title: '',
    target: '',
    color: '#6366f1' // default indigo-500
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
        color: newGoal.color
      });
      setIsCreating(false);
      setNewGoal({ title: '', target: '', color: '#6366f1' });
      fetchGoals();
    } catch (err) {
      alert("Failed to create goal: " + err.message);
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
        <Card title="Create New Goal" className="border-indigo-500/30 bg-indigo-500/5 animate-fade-in">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Goal Name</label>
              <input 
                type="text" 
                placeholder="e.g., Emergency Fund" 
                value={newGoal.title}
                onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Target Amount (₹)</label>
              <input 
                type="number" 
                placeholder="0.00" 
                value={newGoal.target}
                onChange={e => setNewGoal({...newGoal, target: e.target.value})}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={newGoal.color}
                onChange={e => setNewGoal({...newGoal, color: e.target.value})}
                className="h-[50px] w-full max-w-[60px] cursor-pointer rounded-xl bg-slate-900 border border-slate-700 p-1"
              />
              <Button type="submit" className="w-full py-3">Save</Button>
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
          {goals.map(goal => (
            <Card key={goal.id || goal._id} title={goal.title} className="hover:-translate-y-1 transition-transform duration-300">
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-black" style={{ color: goal.color || '#f8fafc'}} >
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
              </div>
            </Card>
          ))}
          {goals.length === 0 && !isCreating && (
            <div className="col-span-full text-center py-20 text-slate-500 flex flex-col items-center bg-slate-900/50 rounded-[24px] border border-slate-800 border-dashed">
              <Target size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium text-slate-400">No goals currently found.</p>
              <p className="text-sm mt-2">Click "New Goal" above to start tracking your dreams.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
