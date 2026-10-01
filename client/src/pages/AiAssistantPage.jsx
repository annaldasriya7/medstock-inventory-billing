import React, { useState } from 'react';
import { Bot, Send, Sparkles, ShieldAlert, CheckCircle, RefreshCw, User } from 'lucide-react';
import { api } from '../services/api';

const AiAssistantPage = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I am MedStock AI's Inventory & Operations Assistant. I can query real-time medicine stock, today's sales, batch expiries, and reorder forecasts from the database. Note: In compliance with medical safety guidelines, I cannot provide clinical diagnosis or dosage advice."
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    "What is today's sales?",
    "Which medicines are at high stock-out risk?",
    "Which medicines may expire soon?",
    "Give me an inventory overview",
    "Which medicines require reordering?"
  ];

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', text: textToSend.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.askAssistant(textToSend.trim());
      const botMsg = {
        role: 'assistant',
        text: res.answer,
        category: res.category
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `Error contacting inventory database: ${err.message}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Inventory Assistant</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strictly grounded natural language Q&A querying live pharmacy database records without hallucination.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 text-xs font-semibold rounded-lg border border-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Medical Safety Enforced (No diagnosis or dosage)</span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 text-xs max-w-2xl ${
                m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-cyan-500/20 text-cyan-700 border border-cyan-500/30'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-4 rounded-2xl leading-relaxed whitespace-pre-line shadow-xs ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : m.category === 'medical_safety_guardrail'
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-tl-none font-medium'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600" />
              <span>Querying database records...</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Prompts */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Quick Queries:</span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(qp)}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shrink-0 transition-colors"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask about inventory, today's sales, expiry, or medicines..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="p-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl disabled:opacity-40 transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiAssistantPage;
