import React from 'react';
import { Card } from '../components/SharedUI';

const DashboardPage = () => (
  <div className="space-y-8 animate-fade-in">
    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card title="Net Savings"><h3 className="text-3xl font-black text-indigo-600">₹45,000</h3></Card>
      <Card title="Monthly Income"><h3 className="text-3xl font-black text-emerald-600">₹1,20,000</h3></Card>
      <Card title="Total Expense"><h3 className="text-3xl font-black text-rose-500">₹75,000</h3></Card>
    </div>
  </div>
);

export default DashboardPage;
