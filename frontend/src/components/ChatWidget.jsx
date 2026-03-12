import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { api } from '../utils/api';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: "Hi! I'm your FinPlan AI Assistant. How can I help you with your finances today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: userMsg, history: messages });
      setMessages(prev => [...prev, { role: 'bot', content: res.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: "I'm having trouble connecting to my brain right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-indigo-600 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-white" />
              <span className="font-bold text-white">FinPlan AI Advisor</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl flex gap-3 ${
                  msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}>
                  {msg.role === 'bot' && <Bot size={16} className="mt-1 shrink-0 text-indigo-400" />}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-200 p-3 rounded-2xl rounded-bl-none border border-slate-700 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-indigo-400" />
                  <span className="text-xs font-medium italic">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
            <input 
              type="text" 
              placeholder="Ask about your spending..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-indigo-600 text-white'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};

export default ChatWidget;
