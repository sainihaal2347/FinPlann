import React, { useState, useEffect } from 'react';
import { Card, ProgressBar } from '../components/SharedUI';
import { TrendingUp, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { api } from '../utils/api';
import { getCategoryColor } from '../utils/categoryColors';

const CashFlowPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [timeframe, setTimeframe] = useState('all'); // 'all', '7days', '30days', 'thisMonth', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  // Apply Timeframe Filtering
  const filteredTxs = transactions.filter(t => {
    if (timeframe === 'all') return true;

    const txDate = new Date(t.date || t.created_at);
    txDate.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (timeframe === 'custom') {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(0, 0, 0, 0);
      
      if (start && txDate < start) return false;
      if (end && txDate > end) return false;
      return true;
    }

    const diffTime = Math.abs(now - txDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (timeframe === '7days') return diffDays <= 7;
    if (timeframe === '30days') return diffDays <= 30;
    if (timeframe === 'thisMonth') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const totalIncome = filteredTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Prepare data for Spending Habits pie chart
  const categoryTotals = filteredTxs.filter(t => t.type === 'expense').reduce((acc, t) => {
    let cat = t.category || "General";
    
    // If it's still "General" or empty, try legacy keyword matching
    if (!cat || cat === "General" || cat === "Other" || cat === "Uncategorized") {
      const l = t.label.toLowerCase();
      if(l.includes('food') || l.includes('dining') || l.includes('restaurant')) cat = 'Food & Dining';
      else if(l.includes('grocery') || l.includes('supermarket') || l.includes('mart')) cat = 'Groceries & Supermarkets';
      else if(l.includes('fuel') || l.includes('petrol') || l.includes('auto') || l.includes('gas')) cat = 'Fuel & Auto';
      else if(l.includes('health') || l.includes('pharmacy') || l.includes('doctor') || l.includes('hospital')) cat = 'Health & Pharmacy';
      else if(l.includes('cab') || l.includes('uber') || l.includes('ola') || l.includes('transport') || l.includes('transit')) cat = 'Transport / Cab';
      else if(l.includes('entertainment') || l.includes('netflix') || l.includes('spotify') || l.includes('subscription')) cat = 'Entertainment';
      else if(l.includes('credit card') || l.includes('loan') || l.includes('emi') || l.includes('interest') || l.includes('financial')) cat = 'Financial / Credit Card / Loan';
      else if(l.includes('shopping') || l.includes('amazon') || l.includes('flipkart') || l.includes('ecommerce')) cat = 'Shopping / E-commerce';
      else if(l.includes('utility') || l.includes('telecom') || l.includes('recharge') || l.includes('bill') || l.includes('electricity') || l.includes('water')) cat = 'Utilities & Telecom';
      else if(l.includes('p2p') || l.includes('transfer') || l.includes('sent')) cat = 'Peer-to-Peer (P2P)';
      else cat = 'Uncategorized';
    }

    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {});

  const pieData = Object.keys(categoryTotals).map(key => ({
    name: key,
    value: categoryTotals[key]
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#3b82f6', '#f43f5e', '#64748b'];

  const expenses = filteredTxs.filter(t => t.type === 'expense');
  const largestExpense = expenses.length > 0 ? expenses.reduce((max, t) => t.amount > max.amount ? t : max, expenses[0]) : null;
  const excludedInsight = ['Peer-to-Peer (P2P)', 'Uncategorized', 'General', 'Other'];
  const filteredPieData = pieData.filter(d => !excludedInsight.some(ex => d.name.includes(ex)));
  const topCategory = filteredPieData.length > 0 ? filteredPieData[0] : null;

  const totalGoalTarget = goals.reduce((sum, g) => sum + g.target, 0);
  const totalGoalCurrent = goals.reduce((sum, g) => sum + g.current, 0);
  const goalProgressPercentage = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">AI Insights</h2>
          <p className="text-slate-400 mt-2">Valuable insights about your spending habits and financial trajectory.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="flex flex-wrap gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shadow-inner w-full sm:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: '7days', label: '7D' },
              { id: '30days', label: '30D' },
              { id: 'thisMonth', label: 'Month' },
              { id: 'custom', label: 'Custom' }
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === tf.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {timeframe === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in bg-slate-900 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-white text-[10px] p-1.5 outline-none focus:ring-1 focus:ring-indigo-500 rounded"
              />
              <span className="text-slate-600 text-[10px] font-bold">TO</span>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-white text-[10px] p-1.5 outline-none focus:ring-1 focus:ring-indigo-500 rounded"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Quick Projections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-1 sm:mb-2 relative z-10">Identified Income</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 relative z-10 opacity-90">₹{totalIncome.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-1 sm:mb-2 relative z-10">Net Savings</p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-400 relative z-10 opacity-90">₹{netSavings.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors"></div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-1 sm:mb-2 relative z-10">Largest Expense</p>
            <p className="text-2xl sm:text-3xl font-black text-rose-400 relative z-10 opacity-90">{largestExpense ? `₹${largestExpense.amount.toLocaleString()}` : 'N/A'}</p>
            {largestExpense && <p className="text-[10px] font-bold text-slate-500 mt-0.5 sm:mt-1 truncate relative z-10">{largestExpense.label}</p>}
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors"></div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-1 sm:mb-2 relative z-10">Top Spent Category</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-400 relative z-10 opacity-90 truncate">{topCategory ? topCategory.name : 'N/A'}</p>
            {topCategory && <p className="text-[10px] font-bold text-slate-500 mt-0.5 sm:mt-1 truncate relative z-10">₹{topCategory.value.toLocaleString()} total</p>}
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
                        <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
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
