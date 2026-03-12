import React, { useState, useEffect } from 'react';
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
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col p-8 shrink-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Zap size={24} fill="currentColor" />
          </div>
          <span className="text-2xl font-black tracking-tight">FinPlanAI</span>
        </div>
        
        <nav className="flex-1 space-y-2">
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
          className="flex items-center gap-4 text-slate-400 font-bold px-4 py-2 rounded-xl hover:text-rose-600 hover:bg-rose-50 transition-all"
        >
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-10 overflow-y-auto bg-slate-50/50">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
