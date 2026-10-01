import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck, Sparkles, Brain } from 'lucide-react';
import { api } from '../services/api';

const WhatIfSimulatorPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [loadingMeds, setLoadingMeds] = useState(true);

  // Simulation Sliders
  const [demandChange, setDemandChange] = useState(30); // +30%
  const [leadTimeDelay, setLeadTimeDelay] = useState(5); // +5 days
  const [stockChange, setStockChange] = useState(-20); // -20%
  const [emergencySurge, setEmergencySurge] = useState(0);

  // Simulation Result
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const fetchMeds = async () => {
      try {
        setLoadingMeds(true);
        const res = await api.getMedicines('limit=100');
        const list = res.medicines || [];
        setMedicines(list);
        if (list.length > 0) {
          setSelectedMedicineId(list[0]._id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMeds(false);
      }
    };
    fetchMeds();
  }, []);

  const runSimulation = async () => {
    if (!selectedMedicineId) return;
    try {
      setSimulating(true);
      const res = await api.runSimulation({
        medicineId: selectedMedicineId,
        demandChangePercent: Number(demandChange),
        leadTimeDelayDays: Number(leadTimeDelay),
        stockChangePercent: Number(stockChange),
        emergencySurgeUnits: Number(emergencySurge)
      });
      setSimResult(res.simulation);
    } catch (err) {
      alert(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    if (selectedMedicineId) {
      runSimulation();
    }
  }, [selectedMedicineId, demandChange, leadTimeDelay, stockChange, emergencySurge]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">What-If Supply Chain Simulator</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulate epidemic surges, vendor delivery delays, and stock disruptions in memory without mutating database.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Read-Only Sandbox (No DB changes)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-slate-800 border-b pb-3">Scenario Parameters</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Medicine</label>
            <select
              value={selectedMedicineId}
              onChange={(e) => setSelectedMedicineId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl"
            >
              {medicines.map(m => (
                <option key={m._id} value={m._id}>{m.name} ({m.totalStock} units in stock)</option>
              ))}
            </select>
          </div>

          {/* Slider 1: Demand Change */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600">Demand Surge / Drop</span>
              <span className="font-bold text-indigo-600">{demandChange > 0 ? `+${demandChange}%` : `${demandChange}%`}</span>
            </div>
            <input
              type="range"
              min="-50"
              max="150"
              step="5"
              value={demandChange}
              onChange={(e) => setDemandChange(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>-50% (Drop)</span>
              <span>Baseline (0%)</span>
              <span>+150% (Outbreak)</span>
            </div>
          </div>

          {/* Slider 2: Supplier Delay */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600">Supplier Delay (Days)</span>
              <span className="font-bold text-indigo-600">+{leadTimeDelay} days</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={leadTimeDelay}
              onChange={(e) => setLeadTimeDelay(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Slider 3: Stock Damage / Discrepancy */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600">Stock Loss / Damage</span>
              <span className="font-bold text-rose-600">{stockChange}%</span>
            </div>
            <input
              type="range"
              min="-80"
              max="0"
              step="5"
              value={stockChange}
              onChange={(e) => setStockChange(Number(e.target.value))}
              className="w-full accent-rose-600"
            />
          </div>

          {/* Quick Scenario Preset Buttons */}
          <div className="pt-2 border-t space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">One-Click Presets</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setDemandChange(40); setLeadTimeDelay(5); setStockChange(0); }}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200"
              >
                <p className="font-bold text-slate-800">Flu Outbreak</p>
                <p className="text-[10px] text-slate-500">+40% Demand, +5d Lead</p>
              </button>
              <button
                type="button"
                onClick={() => { setDemandChange(0); setLeadTimeDelay(10); setStockChange(-25); }}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200"
              >
                <p className="font-bold text-slate-800">Supply Bottleneck</p>
                <p className="text-[10px] text-slate-500">+10d Delay, -25% Stock</p>
              </button>
            </div>
          </div>
        </div>

        {/* Results Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {simResult ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  Simulation Outcome: {simResult.medicineName}
                </h3>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${
                  simResult.simulated.riskLevel === 'Critical'
                    ? 'bg-rose-100 text-rose-800 animate-pulse'
                    : simResult.simulated.riskLevel === 'High'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {simResult.simulated.riskLevel} Risk
                </span>
              </div>

              {/* Comparison Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Baseline */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Baseline (Actual)</span>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Stock:</span>
                      <span className="font-bold">{simResult.baseline.currentStock} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Daily Demand:</span>
                      <span className="font-bold">{simResult.baseline.dailyConsumption}/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Lead Time:</span>
                      <span className="font-bold">{simResult.baseline.leadTimeDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Stockout In:</span>
                      <span className="font-bold">{simResult.baseline.daysToStockout} days</span>
                    </div>
                  </div>
                </div>

                {/* Simulated */}
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-indigo-700">Simulated Scenario</span>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sim. Stock:</span>
                      <span className="font-bold text-indigo-900">{simResult.simulated.currentStock} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sim. Daily Demand:</span>
                      <span className="font-bold text-indigo-900">{simResult.simulated.dailyConsumption}/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sim. Lead Time:</span>
                      <span className="font-bold text-indigo-900">{simResult.simulated.leadTimeDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sim. Stockout:</span>
                      <span className="font-extrabold text-rose-600">{simResult.simulated.daysToStockout} days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delta Impact */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Projected Supply Delta</span>
                <p className="text-slate-200 text-xs">
                  Stock depletion accelerates by <span className="font-bold text-amber-400">{Math.abs(simResult.delta.daysDifference)} days</span>.
                  Under this scenario, recommended reorder buffer increases to <span className="font-bold text-emerald-400">{simResult.simulated.reorderQty} units</span> (a change of +{simResult.delta.reorderDelta} units).
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400">
              <Brain className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs">Select a medicine to view simulation outcome.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatIfSimulatorPage;
