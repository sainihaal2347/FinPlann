import React from 'react';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all rounded-xl mx-2
      ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-indigo-50'}
    `}
  >
    <Icon size={20} />
    <span className="font-semibold text-sm">{label}</span>
  </div>
);

export default SidebarItem;
