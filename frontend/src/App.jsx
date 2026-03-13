import React, { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import SettingsPage from './pages/SettingsPage';
import CashFlowPage from './pages/CashFlowPage';
import AccountsPage from './pages/AccountsPage';
import BudgetsPage from './pages/BudgetsPage';
import SidebarItem from './components/SidebarItem';
import ChatWidget from './components/ChatWidget';
import { LayoutDashboard, Target, Settings, LogOut, Zap, TrendingUp, Menu, X, Wallet, PieChart } from 'lucide-react';

const App = () => {
  // Safe authentication state check
  const [isAuth, setIsAuth] = useState(() => {
    const token = localStorage.getItem("token");
    return !!token && token !== "undefined";
  });
  
  const [view, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    setIsAuth(false);
  };

  // Ensure login page shows if not authenticated
  if (!isAuth) {
    return <LoginPage onAuthSuccess={() => setIsAuth(true)} />;
  }

  const navigateTo = (newView) => {
    setView(newView);
    setIsSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  // Routing logic based on state
  const renderContent = () => {
    switch(view) {
      case 'dashboard': return <DashboardPage />;
      case 'goals': return <GoalsPage />;
      case 'insights': return <CashFlowPage />;
      case 'accounts': return <AccountsPage />;
      case 'budgets': return <BudgetsPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black font-sans text-slate-100 overflow-hidden selection:bg-indigo-500/30">
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="FinPlan AI" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-xl font-black tracking-tight text-white italic">FinPlan <span className="text-indigo-400">AI</span></span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/95 lg:bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col p-8 transition-transform duration-300 lg:relative lg:translate-x-0 lg:shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 w-full h-48 bg-indigo-600/10 blur-[60px] rounded-full pointer-events-none -translate-y-1/2"></div>
        
        <div className="flex items-center justify-between mb-12 relative z-10">
          <div className="flex items-center gap-3">
             <img src="/logo.png" alt="FinPlan AI" className="w-10 h-10 rounded-xl object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
             <span className="text-2xl font-black tracking-tight text-white italic">FinPlan <span className="text-indigo-400">AI</span></span>
          </div>
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 space-y-2 relative z-10">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={view === 'dashboard'} 
            onClick={() => navigateTo('dashboard')} 
          />
          <SidebarItem 
            icon={Target} 
            label="Goals" 
            active={view === 'goals'} 
            onClick={() => navigateTo('goals')} 
          />
          <SidebarItem 
            icon={TrendingUp} 
            label="Insights" 
            active={view === 'insights'} 
            onClick={() => navigateTo('insights')} 
          />
          <SidebarItem 
            icon={Wallet} 
            label="Accounts" 
            active={view === 'accounts'} 
            onClick={() => navigateTo('accounts')} 
          />
          <SidebarItem 
            icon={PieChart} 
            label="Budgets" 
            active={view === 'budgets'} 
            onClick={() => navigateTo('budgets')} 
          />
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={view === 'settings'} 
            onClick={() => navigateTo('settings')} 
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
      <main className="flex-1 pt-24 pb-10 px-4 md:px-10 lg:pt-10 overflow-y-auto bg-transparent relative">
        <div className="max-w-6xl mx-auto relative z-10">
          {renderContent()}
        </div>
      </main>
      <ChatWidget />
    </div>
  );
};

export default App;
