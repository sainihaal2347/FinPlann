import React, { useState, useEffect } from 'react';
import { Card, ProgressBar } from '../components/SharedUI';
import { TrendingUp, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { api } from '../utils/api';

const CashFlowPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txs, gls] = await Promise.all([
        api.get('/user/transactions'),
        api.get('/user/goals')
      ]);
      if (Array.isArray(txs)) setTransactions(txs);
      if (Array.isArray(gls)) setGoals(gls);
    } catch (err) {
      console.error("Failed to fetch insight data", err);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Prepare data for Spending Habits pie chart
  const expenses = transactions.filter(t => t.type === 'expense');
  // Group by rough categorization
  const categoryTotals = expenses.reduce((acc, curr) => {
    let cat = 'Other';
    const l = curr.label.toLowerCase();
    if(l.includes('food') || l.includes('restaurant') || l.includes('grocery')) cat = 'Food & Dining';
    else if(l.includes('uber') || l.includes('gas') || l.includes('transit') || l.includes('transport')) cat = 'Transportation';
    else if(l.includes('rent') || l.includes('mortgage') || l.includes('utility')) cat = 'Housing';
    else if(l.includes('netflix') || l.includes('spotify') || l.includes('entertainment') || l.includes('subscription')) cat = 'Entertainment';
    else if(l.includes('amazon') || l.includes('shopping') || l.includes('clothes')) cat = 'Shopping';
    else if(l.includes('health') || l.includes('doctor') || l.includes('pharmacy')) cat = 'Healthcare';
    else if(l.includes('education') || l.includes('course') || l.includes('book')) cat = 'Education';

    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {});

  const pieData = Object.keys(categoryTotals).map(key => ({
    name: key,
    value: categoryTotals[key]
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b', '#06b6d4'];

  const largestExpense = expenses.length > 0 ? expenses.reduce((max, t) => t.amount > max.amount ? t : max, expenses[0]) : null;
  const filteredPieData = pieData.filter(d => d.name !== 'Other');
  const topCategory = filteredPieData.length > 0 ? filteredPieData[0] : null;

  const totalGoalTarget = goals.reduce((sum, g) => sum + g.target, 0);
  const totalGoalCurrent = goals.reduce((sum, g) => sum + g.current, 0);
  const goalProgressPercentage = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col justify-between items-start gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">AI Insights</h2>
          <p className="text-slate-400 mt-2">Valuable insights about your spending habits and financial trajectory.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Quick Projections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2 relative z-10">Identified Income</p>
            <p className="text-3xl font-black text-emerald-400 relative z-10 opacity-90">₹{totalIncome.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2 relative z-10">Net Savings</p>
            <p className="text-3xl font-black text-indigo-400 relative z-10 opacity-90">₹{netSavings.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors"></div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2 relative z-10">Largest Expense</p>
            <p className="text-3xl font-black text-rose-400 relative z-10 opacity-90">{largestExpense ? `₹${largestExpense.amount.toLocaleString()}` : 'N/A'}</p>
            {largestExpense && <p className="text-xs font-bold text-slate-500 mt-1 truncate relative z-10">{largestExpense.label}</p>}
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors"></div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2 relative z-10">Top Spent Category</p>
            <p className="text-3xl font-black text-amber-400 relative z-10 opacity-90 truncate">{topCategory ? topCategory.name : 'N/A'}</p>
            {topCategory && <p className="text-xs font-bold text-slate-500 mt-1 truncate relative z-10">₹{topCategory.value.toLocaleString()} total</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Spending Habits */}
          <Card title="Spending Habits" className="flex flex-col">
            {pieData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-10 opacity-75">
                <PieChartIcon size={48} className="mb-4 opacity-30" />
                <p className="text-sm font-medium">Record some expenses to see habits.</p>
              </div>
            )}
          </Card>

          {/* Overall Goals Progress */}
          <Card title="Wealth Trajectory" className="flex flex-col">
            {goals.length > 0 ? (
              <div className="flex-1 flex flex-col justify-center space-y-6 py-6 h-[300px]">
                <div className="text-center">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2">Total Combined Targets</p>
                  <p className="text-4xl font-black text-white">₹{totalGoalTarget.toLocaleString()}</p>
                </div>
                
                <div className="space-y-2 px-6">
                  <div className="flex items-end justify-between">
                    <p className="text-emerald-400 font-bold text-lg">₹{totalGoalCurrent.toLocaleString()}</p>
                    <span className="text-sm font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded">
                      {goalProgressPercentage}% Saved
                    </span>
                  </div>
                  <ProgressBar current={totalGoalCurrent} target={totalGoalTarget} color="#10b981" />
                </div>
                <div className="text-center pt-2">
                  <p className="text-sm text-slate-400">Keep sticking to your budget to hit your targets faster!</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-10 opacity-75">
                <Activity size={48} className="mb-4 opacity-30" />
                <p className="text-sm font-medium">Create goals to see overall trajectory.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CashFlowPage;
