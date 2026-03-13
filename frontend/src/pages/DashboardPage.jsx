import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/SharedUI';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { api } from '../utils/api';
import { getCategoryColor } from '../utils/categoryColors';
import { Plus, X, ArrowUpRight, ArrowDownRight, RefreshCw, FileUp, Trash2, Download, Wallet } from 'lucide-react';
import AccountPicker from '../components/AccountPicker';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DashboardPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [txLimit, setTxLimit] = useState(10);
  const [txTimeframe, setTxTimeframe] = useState('all'); // 'all', '7days', '30days', 'thisMonth', 'custom'
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');
  const [txAccountFilter, setTxAccountFilter] = useState('all');
  const [accounts, setAccounts] = useState([]);
  const [safeToSpend, setSafeToSpend] = useState(null);
  const [uploadAccountId, setUploadAccountId] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const [form, setForm] = useState({
    type: 'income',
    amount: '',
    label: '',
    category: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, accRes, stsRes] = await Promise.all([
        api.get('/user/transactions'),
        api.get('/user/accounts'),
        api.get('/user/safe-to-spend')
      ]);
      if (Array.isArray(txRes)) setTransactions(txRes);
      if (Array.isArray(accRes)) setAccounts(accRes);
      if (stsRes) setSafeToSpend(stsRes);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await api.upload('/upload-statement', formData, {
        "account-id": uploadAccountId
      });
      if (data.summary) {
        alert(`Successfully imported ${data.inserted} transactions from statement!`);
        fetchData();
      } else {
        alert("Failed to parse statement.");
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to delete ALL transaction records? This cannot be undone.")) return;
    try {
      await api.delete('/user/transactions');
      fetchData();
    } catch (err) {
      alert("Failed to reset transactions: " + err.message);
    }
  };

  const handleDownloadPDF = async () => {
    const dashboard = document.getElementById('dashboard-report');
    if (!dashboard) return;

    try {
      const canvas = await html2canvas(dashboard, {
        backgroundColor: '#0f172a',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FinPlan_Report_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to generate PDF report.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.label) return;
    setIsSubmitting(true);
    try {
      await api.post('/user/transactions', {
        type: form.type,
        amount: parseFloat(form.amount),
        label: form.label,
        category: form.category || "General",
        date: new Date().toISOString(),
        account_id: selectedAccountId
      });
      setShowModal(false);
      setForm({ type: 'income', amount: '', label: '', category: '' });
      setSelectedAccountId(null);
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
  const activityData = React.useMemo(() => {
    const chartDataMap = {};
    if (transactions.length > 0) {
      transactions.forEach(t => {
        const dStr = t.date ? t.date.split('T')[0] : t.created_at?.split('T')[0];
        if (dStr) {
          if (!chartDataMap[dStr]) {
            chartDataMap[dStr] = { date: dStr, income: 0, expense: 0 };
          }
          chartDataMap[dStr][t.type] += t.amount;
        }
      });
      return Object.values(chartDataMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Empty state fallback (7 days)
    const fallback = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      fallback.push({ date: dStr, income: 0, expense: 0 });
    }
    return fallback;
  }, [transactions]);

  // Format data for category breakdown
  const categoryData = React.useMemo(() => {
    const caps = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || "General";
      if (!caps[cat]) caps[cat] = 0;
      caps[cat] += t.amount;
    });
    return Object.entries(caps)
      .map(([name, expense]) => ({ name, expense }))
      .sort((a, b) => b.expense - a.expense)
      .slice(0, 8); // Top 8 categories
  }, [transactions]);

  // Refined Top Spend Category (Excluding P2P, Uncategorized, etc.)
  const topSpendCategory = React.useMemo(() => {
    const caps = {};
    const excluded = ['Peer-to-Peer (P2P)', 'Uncategorized', 'General', 'Other'];
    transactions
      .filter(t => t.type === 'expense' && !excluded.some(ex => t.category?.includes(ex)))
      .forEach(t => {
        const cat = t.category || "General";
        caps[cat] = (caps[cat] || 0) + t.amount;
      });
    
    const sorted = Object.entries(caps).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? { name: sorted[0][0], amount: sorted[0][1] } : null;
  }, [transactions]);

  // Filter recent transactions
  const filteredTransactions = transactions.filter(t => {
    // Account Filter
    if (txAccountFilter !== 'all' && t.account_id !== txAccountFilter) return false;

    // Timeframe Filter
    if (txTimeframe === 'all') return true;

    const txDate = new Date(t.date || t.created_at);
    txDate.setHours(0, 0, 0, 0); // Reset for clean comparison
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (txTimeframe === 'custom') {
      const start = txStartDate ? new Date(txStartDate) : null;
      const end = txEndDate ? new Date(txEndDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(0, 0, 0, 0);
      
      if (start && txDate < start) return false;
      if (end && txDate > end) return false;
      return true;
    }

    const diffTime = Math.abs(now - txDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (txTimeframe === '7days') return diffDays <= 7;
    if (txTimeframe === '30days') return diffDays <= 30;
    if (txTimeframe === 'thisMonth') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    return true;
  }).slice(0, txLimit);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Overview</h2>
          <p className="text-slate-400 mt-2">Welcome back! Here's your financial summary.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button variant="outline" onClick={fetchData} className="!p-2 sm:!p-3 border-slate-700 hover:bg-slate-800" title="Refresh">
            <RefreshCw size={18} className={loading ? "animate-spin text-indigo-400" : "text-slate-400"} />
          </Button>

          <Button onClick={handleDownloadPDF} variant="outline" className="gap-2 border-slate-700 bg-slate-900/50 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-400 text-xs sm:text-sm px-3 sm:px-6" title="Export PDF">
            <Download size={18} /> <span className="hidden sm:inline">Report</span>
          </Button>

          <Button onClick={handleReset} variant="outline" className="gap-2 border-slate-700 bg-slate-900/50 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs sm:text-sm px-3 sm:px-6" title="Wipe Data">
            <Trash2 size={18} /> <span className="hidden sm:inline">Reset</span>
          </Button>

          <div className="relative flex items-center">
            <input
              type="file"
              id="dashboard-upload"
              accept=".csv"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <label htmlFor="dashboard-upload" className="flex items-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-xl transition-all shadow-md text-xs sm:text-sm">
              <FileUp size={18} />
              <span>{uploading ? '...' : 'Upload'}</span>
            </label>
          </div>

          <Button onClick={() => setShowModal(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm px-3 sm:px-6">
            <Plus size={18} /> <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      <div id="dashboard-report" className="space-y-8 p-1">
        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card title="Net Savings" className="border-t-4 border-t-indigo-500">
            <h3 className="text-2xl lg:text-3xl font-black text-white">₹{netSavings.toLocaleString()}</h3>
            <p className={`text-xs font-bold mt-2 ${netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netSavings >= 0 ? '+' : ''}{netSavings > 0 ? 'Surplus' : netSavings < 0 ? 'Deficit' : 'Balanced'}
            </p>
          </Card>
          <Card title="Total Income" className="border-t-4 border-t-emerald-500">
            <h3 className="text-2xl lg:text-3xl font-black text-white">₹{totalIncome.toLocaleString()}</h3>
            <p className="text-emerald-400 text-xs font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={14} /> Recorded</p>
          </Card>
          <Card title="Total Expense" className="border-t-4 border-t-rose-500">
            <h3 className="text-2xl lg:text-3xl font-black text-white">₹{totalExpense.toLocaleString()}</h3>
            <p className="text-rose-400 text-xs font-bold mt-2 flex items-center gap-1"><ArrowDownRight size={14} /> Recorded</p>
          </Card>
          <Card title="Top Spend Category" className="border-t-4 border-t-amber-500">
            <h3 className="text-2xl lg:text-3xl font-black text-white truncate" title={topSpendCategory?.name || 'N/A'}>
              {topSpendCategory ? topSpendCategory.name : 'N/A'}
            </h3>
            <p className="text-amber-400 text-xs font-bold mt-2 flex items-center gap-1">
              {topSpendCategory ? `₹${topSpendCategory.amount.toLocaleString()} spent` : 'No valid expenses'}
            </p>
          </Card>
        </div>

        {safeToSpend && safeToSpend.total_monthly_limit > 0 && (
          <Card className="bg-indigo-600/10 border-indigo-500/30 overflow-hidden relative mt-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[40px] rounded-full pointer-events-none -mr-16 -mt-16"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-indigo-400 font-bold uppercase tracking-wider text-[10px] mb-1">Safe to Spend Today</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white">₹{safeToSpend.safe_to_spend_today.toLocaleString()}</h2>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">Mthly Budget</p>
                <p className="text-sm font-bold text-slate-300">₹{safeToSpend.total_monthly_limit.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          {/* Net Worth Sidebar-like widget */}
          <Card className="md:col-span-1 bg-indigo-600/5 border-indigo-500/20">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-2">My Pockets</p>
            <div className="space-y-4">
              {accounts.slice(0, 4).map(acc => (
                <div key={acc.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }}></div>
                    <span className="text-sm font-medium text-slate-200 truncate max-w-[80px]">{acc.name}</span>
                  </div>
                  <span className="text-xs font-bold text-white">₹{acc.balance.toLocaleString()}</span>
                </div>
              ))}
              {accounts.length > 4 && <p className="text-[10px] text-indigo-400 font-bold">+{accounts.length - 4} more</p>}
              {accounts.length === 0 && <p className="text-xs text-slate-600 italic">No accounts yet</p>}
            </div>
          </Card>

          <Card className="md:col-span-3 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">Statement Import</h3>
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                <FileUp size={20} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="flex-1 w-full">
                <AccountPicker
                  selectedId={uploadAccountId}
                  onSelect={setUploadAccountId}
                  className="!space-y-1"
                />
              </div>
              <div className="relative">
                <input
                  type="file"
                  id="dashboard-upload-inline"
                  accept=".csv"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading || !uploadAccountId}
                />
                <label
                  htmlFor="dashboard-upload-inline"
                  className={`flex items-center gap-2 cursor-pointer font-bold py-3 px-6 rounded-xl transition-all shadow-md text-sm ${!uploadAccountId ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                >
                  {uploading ? 'Processing...' : 'Choose CSV'}
                </label>
              </div>
            </div>
            {!uploadAccountId && <p className="text-[10px] text-amber-400/60 mt-2 font-bold uppercase tracking-wider">Select a pocket above to enable upload</p>}
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
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(str) => {
                        try {
                          const d = new Date(str);
                          return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                        } catch {
                          return str;
                        }
                      }}
                      stroke="#475569"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ fontWeight: 'bold' }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      formatter={(value, name) => [`₹${value.toLocaleString()}`, name === 'income' ? 'Income' : 'Expense']}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Expense Breakdown" className="min-h-[400px]">
            {categoryData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl mt-4 text-sm text-center px-4">No expenses recorded in the last 7 days.</div>
            ) : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val >= 1000 ? val / 1000 + 'k' : val}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                      cursor={{ fill: '#1e293b', opacity: 0.4 }}
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Expense']}
                    />
                    <Bar dataKey="expense" radius={[4, 4, 0, 0]} barSize={32}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card title="Recent Transactions" className="mt-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Account:</span>
              <select 
                value={txAccountFilter} 
                onChange={e => setTxAccountFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
              >
                <option value="all">All Pockets</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Show:</span>
              <div className="flex items-center">
                <input 
                  type="number" 
                  min="1" 
                  max="1000"
                  value={txLimit} 
                  onChange={e => setTxLimit(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-white text-sm rounded-l-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 w-16"
                  title="Number of records to display"
                />
                <span className="bg-slate-800 border border-l-0 border-slate-700 text-slate-400 text-[10px] font-bold px-2 py-[9px] rounded-r-lg uppercase">Rows</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex flex-wrap gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {[
                { id: 'all', label: 'All' },
                { id: '7days', label: '7D' },
                { id: '30days', label: '30D' },
                { id: 'thisMonth', label: 'Month' },
                { id: 'custom', label: 'Custom' }
              ].map(tf => (
                <button
                  key={tf.id}
                  onClick={() => setTxTimeframe(tf.id)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tighter transition-all ${txTimeframe === tf.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {txTimeframe === 'custom' && (
              <div className="flex items-center gap-1 animate-fade-in">
                <input 
                  type="date" 
                  value={txStartDate}
                  onChange={e => setTxStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-[10px] rounded-lg p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-slate-600 text-[10px] font-bold">to</span>
                <input 
                  type="date" 
                  value={txEndDate}
                  onChange={e => setTxEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-[10px] rounded-lg p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center text-slate-500 py-8 border border-dashed border-slate-800 rounded-xl">
              No transactions found for the selected timeline.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-sm">
                    <th className="pb-3 font-medium px-4">Date</th>
                    <th className="pb-3 font-medium px-4">Label</th>
                    <th className="pb-3 font-medium px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(t => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group relative"
                    >
                      <div
                        className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full opacity-40"
                        style={{ backgroundColor: getCategoryColor(t.category || 'General') }}
                      ></div>
                      <td className="py-4 px-4 text-sm text-slate-300">
                        {new Date(t.date || t.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-200">
                        <div className="flex flex-col">
                          <span className="font-bold">{t.label}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(t.category || 'General') }}></div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: getCategoryColor(t.category || 'General') }}>
                              {t.category || 'General'}
                            </span>
                            <span className="text-[10px] text-slate-600 font-bold">•</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.type}</span>
                          </div>
                        </div>
                      </td>
                      <td className={`py-4 px-4 text-right text-sm font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  onClick={() => setForm({ ...form, type: 'income' })}
                  className={`py-2 px-4 rounded-lg font-bold transition-colors ${form.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                >Income</button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'expense' })}
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
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-xl font-medium"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description / Name</label>
                <input
                  type="text"
                  placeholder="e.g., Monthly Rent Payment"
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <input
                  type="text"
                  list="category-options"
                  placeholder="Select or type category"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
                <datalist id="category-options">
                  {form.type === 'income'
                    ? ['Salary / Major Transfer', 'Peer-to-Peer (P2P)', 'Refund', 'Other'].map(c => <option key={c} value={c} />)
                    : [
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
                        'Uncategorized'
                      ].map(c => <option key={c} value={c} />)
                  }
                </datalist>
              </div>

              <AccountPicker
                selectedId={selectedAccountId}
                onSelect={setSelectedAccountId}
              />

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
