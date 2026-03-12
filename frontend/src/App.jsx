import React, { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import SettingsPage from './pages/SettingsPage';
import CashFlowPage from './pages/CashFlowPage';
import SidebarItem from './components/SidebarItem';
import { LayoutDashboard, Target, Settings, LogOut, Zap, TrendingUp } from 'lucide-react';

const App = () => {
  // Safe authentication state check
  const [isAuth, setIsAuth] = useState(() => {
    const token = localStorage.getItem("token");
    return !!token && token !== "undefined";
  });
  
  const [view, setView] = useState('dashboard');

  const logout = () => {
    localStorage.removeItem("token");
    setIsAuth(false);
  };

  // Ensure login page shows if not authenticated
  if (!isAuth) {
    return <LoginPage onAuthSuccess={() => setIsAuth(true)} />;
  }

  // Routing logic based on state
  const renderContent = () => {
    switch(view) {
      case 'dashboard': return <DashboardPage />;
      case 'goals': return <GoalsPage />;
      case 'insights': return <CashFlowPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black font-sans text-slate-100 overflow-hidden selection:bg-indigo-500/30">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col p-8 shrink-0 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 w-full h-48 bg-indigo-600/10 blur-[60px] rounded-full pointer-events-none -translate-y-1/2"></div>
        
        <div className="flex items-center gap-3 mb-12 relative z-10">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <Zap size={22} fill="currentColor" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">FinPlanAI</span>
        </div>
        
        <nav className="flex-1 space-y-2 relative z-10">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={view === 'dashboard'} 
            onClick={() => setView('dashboard')} 
          />
          <SidebarItem 
            icon={Target} 
            label="Goals" 
            active={view === 'goals'} 
            onClick={() => setView('goals')} 
          />
          <SidebarItem 
            icon={TrendingUp} 
            label="Insights" 
            active={view === 'insights'} 
            onClick={() => setView('insights')} 
          />
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={view === 'settings'} 
            onClick={() => setView('settings')} 
          />
        </nav>

        <button 
          onClick={logout} 
          className="relative z-10 flex items-center gap-4 text-slate-400 font-bold px-4 py-3 rounded-xl hover:text-rose-400 hover:bg-rose-500/10 transition-all group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-10 overflow-y-auto bg-transparent relative">
        <div className="max-w-6xl mx-auto relative z-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
