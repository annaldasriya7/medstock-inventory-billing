import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  Plus,
  RefreshCw,
  X,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  UserCheck,
  FileSpreadsheet,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const StockAdjustmentPage = () => {
  const { user: currentUser } = useAuth();
  const [adjustments, setAdjustments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedReasonFilter, setSelectedReasonFilter] = useState('All');

  // Modals & Forms
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Selected for Adjustment
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [medicineBatches, setMedicineBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [currentSystemQty, setCurrentSystemQty] = useState(0);
  const [physicalCount, setPhysicalCount] = useState('');
  const [reason, setReason] = useState('Damaged');
  const [notes, setNotes] = useState('');

  const isAuthorizedToAdjust = currentUser?.role === 'admin' || currentUser?.role === 'pharmacist';

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedReasonFilter !== 'All') params.append('reason', selectedReasonFilter);

      const [adjRes, medsRes, batchesRes] = await Promise.all([
        api.getStockAdjustments(params.toString()),
        api.getMedicines('limit=200'),
        api.getBatches('limit=500')
      ]);

      setAdjustments(adjRes.adjustments || []);
      setMedicines(medsRes.medicines || []);
      setBatches(batchesRes.batches || []);
    } catch (err) {
      console.error('Error loading stock adjustment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedReasonFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const openAdjustModal = () => {
    setSelectedMedicineId('');
    setMedicineBatches([]);
    setSelectedBatchId('');
    setCurrentSystemQty(0);
    setPhysicalCount('');
    setReason('Damaged');
    setNotes('');
    setFeedback({ type: '', text: '' });
    setIsAdjustModalOpen(true);
  };

  const handleMedicineChange = (medId) => {
    setSelectedMedicineId(medId);
    setSelectedBatchId('');
    setCurrentSystemQty(0);

    if (medId) {
      const filtered = batches.filter((b) => (b.medicineId?._id || b.medicineId) === medId && b.status !== 'Quarantined');
      setMedicineBatches(filtered);
    } else {
      setMedicineBatches([]);
    }
  };

  const handleBatchChange = (bId) => {
    setSelectedBatchId(bId);
    const b = medicineBatches.find((item) => item._id === bId);
    if (b) {
      setCurrentSystemQty(b.quantity || 0);
      setPhysicalCount(b.quantity || 0);
    } else {
      setCurrentSystemQty(0);
      setPhysicalCount('');
    }
  };

  const calculateDifference = () => {
    if (physicalCount === '' || isNaN(Number(physicalCount))) return 0;
    return Number(physicalCount) - currentSystemQty;
  };

  const handleApplyAdjustment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ type: '', text: '' });

    try {
      const payload = {
        medicineId: selectedMedicineId,
        batchId: selectedBatchId,
        physicalQuantity: Number(physicalCount),
        reason,
        notes: notes.trim()
      };

      await api.adjustStock(payload);
      setFeedback({ type: 'success', text: 'Stock discrepancy successfully adjusted and audited!' });

      await loadData();
      setTimeout(() => {
        setIsAdjustModalOpen(false);
      }, 1200);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to adjust stock.' });
    } finally {
      setSubmitting(false);
    }
  };

  const diff = calculateDifference();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Discrepancy & Adjustment</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare physical inventory counts with system stock, adjust quantities with audit trails and reasons.
          </p>
        </div>

        {isAuthorizedToAdjust && (
          <button
            onClick={openAdjustModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Perform Stock Adjustment</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search adjustment #, medicine, batch, staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedReasonFilter}
            onChange={(e) => setSelectedReasonFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700"
          >
            <option value="All">All Adjustment Reasons</option>
            <option value="Damaged">Damaged</option>
            <option value="Expired">Expired</option>
            <option value="Missing">Missing</option>
            <option value="Manual counting error">Counting Error</option>
            <option value="Return">Supplier Return</option>
            <option value="Other">Other</option>
          </select>

          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-emerald-600 bg-slate-50 border border-slate-200 rounded-xl"
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Adjustment Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
            <p className="text-xs">Loading stock adjustment records...</p>
          </div>
        ) : adjustments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">0 Stock Adjustments Found</p>
            <p className="text-xs text-slate-400">
              When physical shelf stock differs from system records, record an adjustment here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Adjustment Ref / Date</th>
                  <th className="px-4 py-3">Medicine Name</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3 text-center">System Qty</th>
                  <th className="px-4 py-3 text-center">Physical Qty</th>
                  <th className="px-4 py-3 text-center">Variance / Diff</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Adjusted By</th>
                  <th className="px-4 py-3">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900">{a.adjustmentNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(a.date).toLocaleDateString()} {new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{a.medicineName}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{a.batchNumber}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-500">{a.previousQuantity}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{a.physicalQuantity}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 font-bold rounded-full ${
                          a.difference > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.difference < 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.difference > 0 && <TrendingUp className="w-3 h-3" />}
                        {a.difference < 0 && <TrendingDown className="w-3 h-3" />}
                        {a.difference > 0 ? `+${a.difference}` : a.difference}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 font-semibold text-[10px] rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        {a.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{a.adjustedBy?.staffName || 'Staff'}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{a.adjustedBy?.role || 'Staff'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{a.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Perform Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Reconcile Physical Stock Discrepancy</h3>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="p-6 space-y-4">
              {feedback.text && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Adjuster Badge */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-600">Authorized Adjuster:</span>
                  <span className="font-bold text-slate-800">{currentUser?.name}</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-700">
                  {currentUser?.role}
                </span>
              </div>

              {/* Step 1: Select Medicine */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Select Medicine *
                </label>
                <select
                  required
                  value={selectedMedicineId}
                  onChange={(e) => handleMedicineChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="">-- Choose Medicine --</option>
                  {medicines.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.dosageForm || 'Tab'} {m.strength || ''}) - Sellable Stock: {m.totalStock || 0}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Specific Batch */}
              {selectedMedicineId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Select Batch to Adjust *
                  </label>
                  {medicineBatches.length > 0 ? (
                    <select
                      required
                      value={selectedBatchId}
                      onChange={(e) => handleBatchChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    >
                      <option value="">-- Choose Batch --</option>
                      {medicineBatches.map((b) => (
                        <option key={b._id} value={b._id}>
                          Batch #{b.batchNumber} — Current System Qty: {b.quantity} (Exp: {new Date(b.expiryDate).toLocaleDateString()}) [{b.status}]
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-xl border border-amber-200">
                      No active non-quarantined batches found for this medicine.
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Comparison Cards & Physical Input */}
              {selectedBatchId && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">System Recorded</span>
                      <span className="text-lg font-bold text-slate-700">{currentSystemQty}</span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Physical Count</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={physicalCount}
                        onChange={(e) => setPhysicalCount(e.target.value)}
                        className="w-full text-center text-lg font-bold text-emerald-700 bg-emerald-50/50 rounded border border-emerald-200 focus:outline-none"
                      />
                    </div>

                    <div
                      className={`p-2 rounded-lg border ${
                        diff > 0
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : diff < 0
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase block">Discrepancy</span>
                      <span className="text-lg font-bold">
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Discrepancy *
                    </label>
                    <select
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                    >
                      <option value="Damaged">Damaged / Broken Packaging</option>
                      <option value="Expired">Expired / Spoiled on Shelf</option>
                      <option value="Missing">Missing / Physical Theft</option>
                      <option value="Manual counting error">Counting Error / Physical Audit Correction</option>
                      <option value="Return">Supplier Return / Defective Lot</option>
                      <option value="Other">Other (Specify in Remarks)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Audit Notes / Remarks {reason === 'Other' && '*'}
                    </label>
                    <input
                      type="text"
                      required={reason === 'Other'}
                      placeholder="e.g., Vial dropped during inventory stock taking"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedBatchId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Applying Adjustment...' : 'Confirm Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAdjustmentPage;
