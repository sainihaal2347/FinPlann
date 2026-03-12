import React from 'react';

export const Card = ({ children, title, className = "" }) => (
  <div className={`bg-slate-900 border border-slate-800/60 p-6 rounded-[24px] shadow-2xl shadow-black/20 backdrop-blur-xl relative overflow-hidden group ${className}`}>
    {/* Subtle gradient overlay */}
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    {title && <h3 className="text-lg font-black mb-6 tracking-tight text-white relative z-10">{title}</h3>}
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

export const Button = ({ children, onClick, variant="primary", disabled=false, type="button", className="" }) => {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)]",
    outline: "border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
  };
  return (
    <button 
      type={type} 
      disabled={disabled} 
      onClick={onClick} 
      className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant] || styles.primary} ${className}`}
    >
      {children}
    </button>
  );
};

export const ProgressBar = ({ current = 0, target = 1, color = '#6366f1' }) => { // Default to indigo-500
  const percentage = Math.min((current / (target || 1)) * 100, 100);
  return (
    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
      <div 
        className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
        style={{ width: `${percentage}%`, backgroundColor: color }}
      >
        {/* Shimmer effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-white/20 -translate-x-full animate-[shimmer_2s_infinite]"></div>
      </div>
    </div>
  );
};
