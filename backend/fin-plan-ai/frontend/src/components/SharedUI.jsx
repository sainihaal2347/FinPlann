import React from 'react';

export const Card = ({ children, title, className = "" }) => (
  <div className={`bg-white p-6 rounded-[24px] shadow-xl border border-gray-100 ${className}`}>
    {title && <h3 className="text-lg font-bold mb-4 tracking-tight">{title}</h3>}
    {children}
  </div>
);

export const Button = ({ children, onClick, variant="primary", disabled=false, type="button", className="" }) => {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 shadow-lg",
    outline: "border-2 border-gray-100 text-gray-700 hover:bg-gray-50"
  };
  return (
    <button 
      type={type} 
      disabled={disabled} 
      onClick={onClick} 
      className={`px-6 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${styles[variant] || styles.primary} ${className}`}
    >
      {children}
    </button>
  );
};

export const ProgressBar = ({ current = 0, target = 1, color = '#4F46E5' }) => {
  const percentage = Math.min((current / (target || 1)) * 100, 100);
  return (
    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%`, backgroundColor: color }} />
    </div>
  );
};
