import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Brain,
  AlertOctagon,
  Clock,
  ShieldCheck,
  RefreshCw,
  Package,
  Layers,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

const PredictionsPage = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('Moving Average');

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const res = await api.getPredictions(`method=${encodeURIComponent(method)}`);
      setPredictions(res.predictions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [method]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Demand Forecasting & Stock-Out Analysis</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical forecasting models with full transparent explainability (XAI) and smart reorder buffers.
          </p>
        </div>

        {/* Algorithm Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="text-xs font-semibold text-slate-500">Method:</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
          >
            <option value="Moving Average">Simple Moving Average</option>
            <option value="Weighted Moving Average">Weighted Moving Average</option>
            <option value="Exponential Smoothing">Exponential Smoothing (α=0.4)</option>
            <option value="Trend Regression">Trend Linear Regression</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-purple-600" />
          <p className="text-xs">Computing statistical demand regressions...</p>
        </div>
      ) : predictions.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
          <Brain className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-700">No predictions available</p>
          <p className="text-xs text-slate-400">Database has 0 registered medicines. Add medicines to run forecasting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {predictions.map((p) => {
            const isCritical = p.stockoutRiskLevel === 'Critical';
            const isHigh = p.stockoutRiskLevel === 'High';

            return (
              <div
                key={p.medicineId}
                className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all ${
                  isCritical
                    ? 'border-rose-300 bg-rose-50/10'
                    : isHigh
                    ? 'border-amber-300 bg-amber-50/10'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{p.medicineName}</h3>
                    <p className="text-[11px] text-slate-400">
                      Method: <span className="font-semibold text-slate-600">{p.methodUsed}</span> • Confidence: <span className="font-semibold text-slate-600">{p.confidenceScore}</span>
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                      isCritical
                        ? 'bg-rose-100 text-rose-800 animate-pulse'
                        : isHigh
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {p.stockoutRiskLevel} Risk
                  </span>
                </div>

                {/* Insufficient data note if sparse history */}
                {!p.hasSufficientData ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                    <p className="font-semibold text-slate-800 mb-0.5">⚠️ Data Notice</p>
                    <p>{p.explanation}</p>
                  </div>
                ) : (
                  <>
                    {/* Explainable Metric Matrix (Requirement 20) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Stock</span>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">{p.currentStock}</p>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Avg Daily Usage</span>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">{p.averageDailyConsumption}/day</p>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Lead Time</span>
                        <p className="font-bold text-indigo-700 text-sm mt-0.5">{p.supplierLeadTimeDays} days</p>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Days to Stockout</span>
                        <p className={`font-extrabold text-sm mt-0.5 ${p.estimatedDaysToStockout <= p.supplierLeadTimeDays ? 'text-rose-600' : 'text-slate-900'}`}>
                          {p.estimatedDaysToStockout} days
                        </p>
                      </div>
                    </div>

                    {/* Explainable Reasoning Card */}
                    <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-purple-900 font-bold">
                        <Brain className="w-3.5 h-3.5 text-purple-600" />
                        <span>Explainable AI (XAI) Calculation Logic</span>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed">{p.explanation}</p>
                    </div>

                    {/* Reorder Recommendation Box (Requirement 22) */}
                    <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Smart Reorder Recommendation
                        </span>
                        <p className="font-bold text-sm text-emerald-400 mt-0.5">
                          {p.reorderRecommendedQty > 0 ? `Order ${p.reorderRecommendedQty} units` : 'Stock is adequate (0 units required)'}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 italic">Admin Approval Required</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PredictionsPage;
