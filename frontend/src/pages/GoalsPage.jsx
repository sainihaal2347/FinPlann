import React, { useState, useEffect } from 'react';
import { Card, ProgressBar } from '../components/SharedUI';
import { api } from '../utils/api';

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/user/goals').then(res => {
      if (Array.isArray(res)) setGoals(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-4xl font-black text-slate-900 tracking-tight">Financial Goals</h2>
      {loading ? (
        <p className="text-slate-400">Loading goals...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map(goal => (
            <Card key={goal.id || goal._id} title={goal.title}>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-slate-500">{goal.current} saved</span>
                <span className="text-indigo-600">{Math.round((goal.current / goal.target) * 100)}%</span>
              </div>
              <ProgressBar current={goal.current} target={goal.target} color={goal.color || "#4F46E5"} />
            </Card>
          ))}
          {goals.length === 0 && <p className="text-slate-400">No goals found. Create one to get started!</p>}
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
