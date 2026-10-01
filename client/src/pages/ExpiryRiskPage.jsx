import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Skull, CheckCircle, IndianRupee, RefreshCw, Layers } from 'lucide-react';
import { api } from '../services/api';

const ExpiryRiskPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchExpiryData = async () => {
    try {
      setLoading(true);
      const res = await api.getExpiryReport();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expiry & Wastage Risk Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Color-coded expiry horizons, projected unconsumed wastage units, and financial loss exposure.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Expired Batches</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{data?.summary?.expiredCount || 0}</p>
          <span className="text-[10px] text-slate-500">Immediate quarantine</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Critical (&lt;1 Mo)</span>
          <p className="text-2xl font-bold text-orange-600 mt-1">{data?.summary?.criticalNearExpiryCount || 0}</p>
          <span className="text-[10px] text-slate-500">Fast FEFO priority</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Near Expiry (1-3 Mo)</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{data?.summary?.nearExpiryCount || 0}</p>
          <span className="text-[10px] text-slate-500">Review stock rotation</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">At-Risk Value</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">₹{data?.summary?.nearExpiryAtRiskValue?.toFixed(2) || '0.00'}</p>
          <span className="text-[10px] text-slate-500">Capital at risk</span>
        </div>
      </div>

      {/* Risk Buckets */}
      <div className="space-y-4">
        {/* Critical / Expired */}
        {data?.categorized?.expired?.length > 0 && (
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs font-bold text-rose-900">
              <span className="flex items-center gap-1.5"><Skull className="w-4 h-4 text-rose-600" /> Expired Batches (Action: Discard / Quarantine)</span>
              <span>{data.categorized.expired.length} batch(es)</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {data.categorized.expired.map(b => (
                <div key={b.batchId} className="p-3.5 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-800">{b.medicineName} — Batch: {b.batchNumber}</p>
                    <p className="text-[11px] text-rose-600 font-semibold">Expired {Math.abs(b.daysRemaining)} days ago ({new Date(b.expiryDate).toLocaleDateString()})</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{b.quantity} units</span>
                    <p className="text-[11px] text-slate-500">Loss: ₹{b.estimatedLoss}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical Near Expiry (<30 days) */}
        {data?.categorized?.criticalNearExpiry?.length > 0 && (
          <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-orange-50 border-b border-orange-200 flex items-center justify-between text-xs font-bold text-orange-900">
              <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-orange-600" /> Critical Near Expiry (&lt;30 Days remaining)</span>
              <span>{data.categorized.criticalNearExpiry.length} batch(es)</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {data.categorized.criticalNearExpiry.map(b => (
                <div key={b.batchId} className="p-3.5 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-800">{b.medicineName} — Batch: {b.batchNumber}</p>
                    <p className="text-[11px] text-orange-600 font-semibold">Expires in {b.daysRemaining} days ({new Date(b.expiryDate).toLocaleDateString()})</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{b.quantity} units</span>
                    <p className="text-[11px] text-slate-500">Value: ₹{b.estimatedLoss}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Safe Batches */}
        {data?.categorized?.safe?.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-900">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-600" /> Safe Shelf-Life (&gt;6 Months remaining)</span>
              <span>{data.categorized.safe.length} batch(es)</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {data.categorized.safe.map(b => (
                <div key={b.batchId} className="p-3 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-800">{b.medicineName} (Batch {b.batchNumber})</p>
                    <p className="text-[11px] text-slate-400">Expires: {new Date(b.expiryDate).toLocaleDateString()} ({b.daysRemaining} days)</p>
                  </div>
                  <span className="font-bold text-slate-900">{b.quantity} units</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!data || (data.categorized?.expired?.length === 0 && data.categorized?.criticalNearExpiry?.length === 0 && data.categorized?.safe?.length === 0)) && (
          <div className="p-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
            <Clock className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">No active batches in database</p>
            <p className="text-xs text-slate-400">Expiry telemetry starts at 0 for an empty database.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiryRiskPage;
