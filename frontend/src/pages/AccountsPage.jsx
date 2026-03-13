import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/SharedUI';
import { Wallet, Landmark, CreditCard, Building2, Plus, Trash2, RefreshCw, X, ArrowUpRight } from 'lucide-react';
import { api } from '../utils/api';

const AccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', type: 'Bank', balance: 0, color: '#6366f1' });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.get('/user/accounts');
      setAccounts(data);
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/user/accounts', newAcc);
      setNewAcc({ name: '', type: 'Bank', balance: 0, color: '#6366f1' });
      setShowAddModal(false);
      fetchAccounts();
    } catch (err) {
      alert("Failed to add account: " + err.message);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm("Are you sure? Transactions linked to this account will become unlinked.")) return;
    try {
      await api.delete(`/user/accounts/${id}`);
      fetchAccounts();
    } catch (err) {
      alert("Failed to delete account: " + err.message);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Bank': return <Landmark size={24} />;
      case 'Credit Card': return <CreditCard size={24} />;
      case 'Investment': return <Building2 size={24} />;
      default: return <Wallet size={24} />;
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Manual Accounts</h2>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">Manage your bank accounts, cards, and cash pockets.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchAccounts} className="!p-2 sm:!p-3 border-slate-700 hover:bg-slate-800">
            <RefreshCw size={18} className={loading && accounts.length ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm px-3 sm:px-6">
            <Plus size={18} /> <span>Add Account</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Worth Summary */}
        <Card className="lg:col-span-3 border-t-4 border-t-emerald-500">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Total Net Worth</p>
              <h2 className="text-4xl sm:text-5xl font-black text-white">₹{totalBalance.toLocaleString()}</h2>
            </div>
            <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
               <ArrowUpRight className="text-emerald-400" size={32} />
            </div>
          </div>
        </Card>

        {accounts.map(acc => (
          <Card key={acc.id} className="group relative">
             <button 
                onClick={() => handleDeleteAccount(acc.id)}
                className="absolute top-4 right-4 text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 rounded-xl text-white shadow-lg" style={{ backgroundColor: acc.color || '#6366f1'}}>
                    {getTypeIcon(acc.type)}
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-white">{acc.name}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{acc.type}</p>
                 </div>
              </div>

              <div className="space-y-1">
                 <p className="text-slate-400 text-sm font-medium">Available Balance</p>
                 <p className="text-3xl font-black text-white">₹{acc.balance.toLocaleString()}</p>
              </div>
          </Card>
        ))}

        {!loading && accounts.length === 0 && (
          <div className="lg:col-span-3 py-20 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[32px] flex flex-col items-center justify-center text-slate-600">
            <Wallet size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-bold">No accounts found</p>
            <p className="text-sm">Click "Add Account" to get started.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-sm border-slate-700 shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-white mb-6">New Account</h3>
            
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Account Name</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="e.g. HDFC Bank" 
                  value={newAcc.name}
                  onChange={e => setNewAcc({...newAcc, name: e.target.value})}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Type</label>
                <select 
                  value={newAcc.type}
                  onChange={e => setNewAcc({...newAcc, type: e.target.value})}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="Bank">Bank</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Investment">Investment</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Initial Balance</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={newAcc.balance}
                  onChange={e => setNewAcc({...newAcc, balance: parseFloat(e.target.value) || 0})}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Theme Color</label>
                <div className="flex gap-2">
                  {['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map(c => (
                    <button 
                      key={c}
                      type="button"
                      onClick={() => setNewAcc({...newAcc, color: c})}
                      className={`w-8 h-8 rounded-full transition-transform ${newAcc.color === c ? 'scale-125 ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full py-4 text-lg mt-4 bg-indigo-600 hover:bg-indigo-500">
                Create Pocket
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
