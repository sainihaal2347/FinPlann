import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/SharedUI';
import { User, Bell, Shield, Smartphone, X } from 'lucide-react';
import { api } from '../utils/api';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ name: 'FinPlan User', email: '' });
  const [toggles, setToggles] = useState({
    emailAlerts: true,
    pushNotifs: false,
    twoFactor: false,
  });
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/user/settings');
      setProfile({ name: res.name || 'FinPlan User', email: res.email });
      setEditName(res.name || 'FinPlan User');
      if (res.settings) {
        setToggles({
          emailAlerts: res.settings.emailAlerts ?? true,
          pushNotifs: res.settings.pushNotifs ?? false,
          twoFactor: res.settings.twoFactor ?? false,
        });
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    // Optimistic UI update
    setToggles(prev => ({ ...prev, [key]: value }));
    try {
      await api.post('/user/settings', { [key]: value });
    } catch (err) {
      // Revert on failure
      setToggles(prev => ({ ...prev, [key]: !value }));
      alert("Failed to update setting: " + err.message);
    }
  };

  const handleToggle = (key) => {
    const newValue = !toggles[key];
    updateSetting(key, newValue);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/user/settings', { name: editName });
      setProfile(prev => ({ ...prev, name: editName }));
      setShowEditModal(false);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-800/50 hover:bg-slate-800/20 px-4 rounded-xl transition-colors">
      <div>
        <h4 className="text-white font-bold">{label}</h4>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
      <button 
        onClick={onChange}
        disabled={loading}
        className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${checked ? 'bg-indigo-500' : 'bg-slate-700'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform transform absolute ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Settings</h2>
          <p className="text-slate-400 mt-2">Manage your account preferences and security.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Details */}
        <Card className="lg:col-span-1 space-y-6">
          <div className="flex flex-col items-center pb-6 border-b border-slate-800/50">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-emerald-400 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] mb-4">
              <span className="text-3xl font-black">{profile.name.substring(0,2).toUpperCase()}</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">{loading ? 'Loading...' : profile.name}</h3>
            <p className="text-slate-400 text-sm mt-1">{loading ? '...' : profile.email || 'Pro Member'}</p>
          </div>
          
          <div className="space-y-3">
            <Button onClick={() => setShowEditModal(true)} variant="outline" className="w-full justify-start gap-4 py-3 bg-slate-800/50 hover:bg-slate-700 border-slate-700">
              <User size={18} className="text-indigo-400" /> Edit Profile
            </Button>
            <Button variant="outline" className="w-full justify-start gap-4 py-3 bg-slate-800/50 hover:bg-slate-700 border-slate-700">
              <Smartphone size={18} className="text-emerald-400" /> Connected Devices
            </Button>
          </div>
        </Card>

        {/* Preferences */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/10 rounded-lg"><Bell size={20} className="text-indigo-500" /></div>
              <h3 className="text-xl font-black text-white tracking-tight">Notifications</h3>
            </div>
            <div className="space-y-1">
              <ToggleSwitch 
                label="Email Alerts" 
                description="Receive weekly summaries and goal updates via email."
                checked={toggles.emailAlerts}
                onChange={() => handleToggle('emailAlerts')}
              />
              <ToggleSwitch 
                label="Push Notifications" 
                description="Get instant alerts for large transactions."
                checked={toggles.pushNotifs}
                onChange={() => handleToggle('pushNotifs')}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-500/10 rounded-lg"><Shield size={20} className="text-emerald-500" /></div>
              <h3 className="text-xl font-black text-white tracking-tight">Security</h3>
            </div>
            <div className="space-y-1">
              <ToggleSwitch 
                label="Two-Factor Authentication (2FA)" 
                description="Add an extra layer of security to your account."
                checked={toggles.twoFactor}
                onChange={() => handleToggle('twoFactor')}
              />
            </div>
            <div className="mt-6 pt-6 border-t border-slate-800/50">
              <Button variant="outline" className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300">
                Change Password
              </Button>
            </div>
          </Card>
        </div>

      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-sm border-slate-700 shadow-2xl relative">
            <button onClick={() => setShowEditModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-white mb-6">Edit Profile</h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Your Name" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium"
                  required
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full py-4 text-lg mt-4 bg-indigo-600 hover:bg-indigo-500">
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;
