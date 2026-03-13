import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Wallet } from 'lucide-react';

const AccountPicker = ({ selectedId, onSelect, className = "" }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccs = async () => {
      try {
        const data = await api.get('/user/accounts');
        setAccounts(data);
      } catch (err) {
        console.error("Picker failed to load accounts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccs();
  }, []);

  if (loading) return <div className="text-xs text-slate-500 animate-pulse">Loading accounts...</div>;
  if (accounts.length === 0) return (
    <div className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
      No accounts found. Create one in the Accounts section.
    </div>
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Select Account</label>
      <div className="flex flex-wrap gap-2">
        {accounts.map(acc => (
          <button
            key={acc.id}
            type="button"
            onClick={() => onSelect(acc.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
              selectedId === acc.id 
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }}></div>
            <span className="text-sm font-medium">{acc.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AccountPicker;
