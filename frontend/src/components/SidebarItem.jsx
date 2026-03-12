import React from 'react';

// eslint-disable-next-line react/prop-types, no-unused-vars
const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-300 rounded-xl mx-2 relative overflow-hidden group
      ${active 
        ? 'bg-indigo-500/10 text-indigo-400 font-bold' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }
    `}
  >
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
    <Icon size={20} className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
    <span className="text-sm tracking-wide z-10">{label}</span>
  </div>
);

export default SidebarItem;
