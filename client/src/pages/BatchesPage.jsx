import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, Search, Filter, Clock, AlertTriangle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { api } from '../services/api';

const BatchesPage = () => {
  const [searchParams] = useSearchParams();
  const medicineIdParam = searchParams.get('medicineId');

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (medicineIdParam) params.append('medicineId', medicineIdParam);
      if (search.trim()) params.append('search', search.trim());
      if (status !== 'All') params.append('status', status);

      const res = await api.getBatches(params.toString());
      setBatches(res.batches || []);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [medicineIdParam, status]);

  const getStatusBadge = (bStatus, days) => {
    if (bStatus === 'Expired' || days <= 0) {
      return <span className="px-2 py-0.5 text-[10px] font-bold text-rose-800 bg-rose-100 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" /> Expired</span>;
    }
    if (days <= 30) {
      return <span className="px-2 py-0.5 text-[10px] font-bold text-orange-800 bg-orange-100 rounded-full flex items-center gap-1 animate-pulse"><AlertTriangle className="w-3 h-3" /> Critical Near Expiry ({days}d)</span>;
    }
    if (days <= 90) {
      return <span className="px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Near Expiry ({days}d)</span>;
    }
    if (bStatus === 'Depleted') {
      return <span className="px-2 py-0.5 text-[10px] font-bold text-slate-600 bg-slate-200 rounded-full">Depleted (0 Stock)</span>;
    }
    return <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active ({days}d left)</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Batch Management (FEFO)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Batches sorted strictly by earliest expiry date first (First-Expire, First-Out sequence).
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchBatches();
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by batch number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </form>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 w-full sm:w-auto"
        >
          <option value="All">All Batch Statuses</option>
          <option value="Active">Active</option>
          <option value="Near Expiry">Near Expiry</option>
          <option value="Expired">Expired</option>
          <option value="Depleted">Depleted</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-600" />
            <p className="text-xs">Loading batch telemetry...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Layers className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">No batches recorded</p>
            <p className="text-xs text-slate-400">Database currently contains 0 batch records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">FEFO Priority</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3 text-center">Remaining Quantity</th>
                  <th className="px-4 py-3">Manufacturing Date</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-center">FEFO Expiry Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch, index) => (
                  <tr key={batch._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 font-bold text-[11px] text-slate-700">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {batch.batchNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{batch.medicineId?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-400">{batch.medicineId?.genericName || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-sm text-slate-900">{batch.quantity}</span>
                      <p className="text-[10px] text-slate-400">Initial: {batch.initialQuantity}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {batch.manufacturingDate ? new Date(batch.manufacturingDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      ₹{batch.sellingPrice?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(batch.status, batch.daysUntilExpiry)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchesPage;
