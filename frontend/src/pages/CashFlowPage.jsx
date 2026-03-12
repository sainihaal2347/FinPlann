import React, { useState } from 'react';
import { Card, Button } from '../components/SharedUI';
import { FileUp, TrendingUp, CheckCircle2 } from 'lucide-react';

const CashFlowPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'manual'
  
  const [manualData, setManualData] = useState({ income: '', expense: '' });

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/upload-statement', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      if(data.summary) {
        setInsights(data.summary);
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAnalyze = (e) => {
    e.preventDefault();
    if(!manualData.income || !manualData.expense) return;
    setLoading(true);
    // Simulate AI processing time
    setTimeout(() => {
      setInsights({
        total_income: parseFloat(manualData.income),
        net_savings: parseFloat(manualData.income) - parseFloat(manualData.expense),
        period: "Custom Entry Analysis"
      });
      setLoading(false);
    }, 800);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Insights & Cash Flow</h2>
          <p className="text-slate-400 mt-2">Upload a statement or enter numbers for AI-powered analysis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Input Section */}
        <Card className="lg:col-span-1 border-indigo-500/30 p-0 overflow-hidden flex flex-col">
          <div className="flex border-b border-slate-800">
            <button 
              className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'upload' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
              onClick={() => setActiveTab('upload')}
            >
              CSV Upload
            </button>
            <button 
              className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'manual' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
              onClick={() => setActiveTab('manual')}
            >
              Manual Entry
            </button>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            {activeTab === 'upload' ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white mb-4">Upload Statement</h3>
                  <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5'}`}>
                    <input 
                      type="file" 
                      id="statement-upload" 
                      accept=".csv" 
                      className="hidden" 
                      onChange={e => setFile(e.target.files[0])}
                    />
                    <label htmlFor="statement-upload" className="cursor-pointer flex flex-col items-center gap-4">
                      {file ? (
                        <CheckCircle2 size={48} className="text-emerald-500" />
                      ) : (
                        <FileUp size={48} className="text-indigo-400" />
                      )}
                      
                      <div>
                        <p className="text-white font-bold">{file ? file.name : 'Select CSV file'}</p>
                        <p className="text-sm text-slate-400 mt-1">{file ? 'Ready to analyze' : 'or drag and drop here'}</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || loading} 
                  className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-500 mt-4"
                >
                  {loading ? 'Analyzing...' : 'Analyze Statement'}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleManualAnalyze} className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-lg font-black tracking-tight text-white mb-2">Estimate Projections</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Total Expected Income</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 50000" 
                      value={manualData.income}
                      onChange={e => setManualData({...manualData, income: e.target.value})}
                      className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Total Expected Expenses</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 24000" 
                      value={manualData.expense}
                      onChange={e => setManualData({...manualData, expense: e.target.value})}
                      className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-500 mt-4"
                >
                  {loading ? 'Analyzing...' : 'Generate Insights'}
                </Button>
              </form>
            )}
          </div>
        </Card>

        {/* Results Section */}
        <Card title="AI Analysis Results" className="lg:col-span-2 min-h-[300px] flex flex-col">
          {insights ? (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
                <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2 relative z-10">Total Income Identified</p>
                <p className="text-3xl font-black text-emerald-400 relative z-10">₹{insights.total_income.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
                <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2 relative z-10">Net Savings Predicted</p>
                <p className="text-3xl font-black text-indigo-400 relative z-10">₹{insights.net_savings.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-inner sm:col-span-2 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2">Analysis Period</p>
                  <p className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-indigo-500" />
                    {insights.period}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2">Savings Rate</p>
                  <p className="text-xl font-bold text-amber-400">
                    {Math.round((insights.net_savings / insights.total_income) * 100)}%
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-10 opacity-50">
              <TrendingUp size={64} className="mb-6 opacity-20" />
              <p className="text-lg font-medium text-slate-400">No data analyzed yet.</p>
              <p className="text-sm mt-2 max-w-xs text-center">Provide data on the left to generate smart financial insights.</p>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
};

export default CashFlowPage;
