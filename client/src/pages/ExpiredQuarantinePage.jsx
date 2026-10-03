import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Ban,
  Trash2,
  Undo2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
  FileSpreadsheet,
  IndianRupee,
  Clock,
  Layers,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ExpiredQuarantinePage = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('expired'); // 'expired', 'quarantined', 'history'
  const [summary, setSummary] = useState({});
  const [expiredBatches, setExpiredBatches] = useState([]);
  const [quarantinedBatches, setQuarantinedBatches] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Action Modals
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: '', // 'quarantine', 'dispose', 'return'
    batch: null
  });
  const [modalReason, setModalReason] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const isAuthorized = currentUser?.role === 'admin' || currentUser?.role === 'pharmacist';

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewRes, recordsRes] = await Promise.all([
        api.getQuarantineOverview(),
        api.getQuarantineRecords()
      ]);

      setSummary(overviewRes.summary || {});
      setExpiredBatches(overviewRes.expiredBatches || []);
      setQuarantinedBatches(overviewRes.quarantinedBatches || []);
      setRecords(recordsRes.records || []);
    } catch (err) {
      console.error('Error loading quarantine data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openActionModal = (type, batch) => {
    setActionModal({ isOpen: true, type, batch });
    setModalNotes('');
    setFeedback({ type: '', text: '' });

    if (type === 'quarantine') {
      setModalReason('Passed expiry date threshold');
    } else if (type === 'dispose') {
      setModalReason('Chemical incineration and bio-hazard disposal');
    } else if (type === 'return') {
      setModalReason('Returned to distributor under warranty replacement agreement');
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ type: '', text: '' });

    try {
      if (actionModal.type === 'quarantine') {
        await api.moveToQuarantine({
          batchId: actionModal.batch._id,
          reason: modalReason,
          notes: modalNotes
        });
        setFeedback({ type: 'success', text: 'Batch successfully isolated into Quarantine!' });
      } else {
        const actionName = actionModal.type === 'dispose' ? 'Disposed' : 'Returned to Supplier';
        await api.performQuarantineAction({
          batchId: actionModal.batch._id,
          action: actionName,
          reason: modalReason,
          notes: modalNotes
        });
        setFeedback({ type: 'success', text: `Batch successfully marked as ${actionName}!` });
      }

      await loadData();
      setTimeout(() => {
        setActionModal({ isOpen: false, type: '', batch: null });
      }, 1200);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Operation failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expired Medicine & Quarantine</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict isolation of expired stock to prevent illegal dispensing, protect patients, and manage returns.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Check</span>
        </button>
      </div>

      {/* Safety Policy Warning Banner */}
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
        <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-rose-900">Zero-Tolerance Expiry Lock Active</p>
          <p className="text-rose-700 mt-0.5 leading-relaxed">
            All expired or quarantined batches are automatically excluded from the Point of Sale (POS) cart and FEFO distribution algorithms. Quarantined stock does not count toward sellable inventory.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Expired Batches (Unquarantined)</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{summary.totalExpiredBatches || 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summary.totalExpiredUnits || 0} units • ₹{summary.financialLossExpired?.toFixed(2) || '0.00'} value
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Safely Quarantined Stock</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.totalQuarantinedBatches || 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summary.totalQuarantinedUnits || 0} units • ₹{summary.financialLossQuarantined?.toFixed(2) || '0.00'} isolated
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Expiry Financial Risk</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{summary.totalFinancialRisk?.toFixed(2) || '0.00'}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Eligible for supplier write-off</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('expired')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'expired'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Expired Batches</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-rose-100 text-rose-700 font-bold">
            {expiredBatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('quarantined')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'quarantined'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Quarantine Area</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700 font-bold">
            {quarantinedBatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Disposal & Return Logs</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600 font-bold">
            {records.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Expired Batches */}
      {activeTab === 'expired' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-rose-600" />
              <p className="text-xs">Scanning inventory for expired batches...</p>
            </div>
          ) : expiredBatches.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 stroke-1" />
              <p className="text-sm font-semibold text-slate-700">0 Expired Batches Detected</p>
              <p className="text-xs text-slate-400">All inventory batches are within valid expiration dates.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3">Batch Number</th>
                    <th className="px-4 py-3 text-center">Remaining Qty</th>
                    <th className="px-4 py-3">Expired On</th>
                    <th className="px-4 py-3 text-right">Value (₹)</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiredBatches.map((b) => (
                    <tr key={b._id} className="hover:bg-rose-50/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{b.medicineId?.name || 'Unknown'}</div>
                        <div className="text-[11px] text-slate-400">
                          {b.medicineId?.dosageForm} {b.medicineId?.strength}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-rose-700">{b.batchNumber}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">{b.quantity}</td>
                      <td className="px-4 py-3 text-rose-600 font-semibold">
                        {new Date(b.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        ₹{((b.quantity || 0) * (b.purchasePrice || b.sellingPrice || 0)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.supplierId?.name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {isAuthorized && (
                          <button
                            onClick={() => openActionModal('quarantine', b)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all"
                          >
                            Move to Quarantine
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Quarantined Stock */}
      {activeTab === 'quarantined' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-600" />
              <p className="text-xs">Loading quarantined stock...</p>
            </div>
          ) : quarantinedBatches.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-700">Quarantine Area is Empty</p>
              <p className="text-xs text-slate-400">No batches are currently isolated in quarantine.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3">Batch Number</th>
                    <th className="px-4 py-3 text-center">Quarantined Qty</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3 text-right">Value (₹)</th>
                    <th className="px-4 py-3 text-center">Disposal Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quarantinedBatches.map((b) => (
                    <tr key={b._id} className="hover:bg-amber-50/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{b.medicineId?.name || 'Unknown'}</div>
                        <div className="text-[11px] text-slate-400">
                          {b.medicineId?.dosageForm} {b.medicineId?.strength}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-amber-800">{b.batchNumber}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 font-bold rounded bg-amber-100 text-amber-800">
                          {b.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {new Date(b.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        ₹{((b.quantity || 0) * (b.purchasePrice || b.sellingPrice || 0)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isAuthorized && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openActionModal('dispose', b)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Dispose</span>
                            </button>
                            <button
                              onClick={() => openActionModal('return', b)}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>Return to Supplier</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: History & Disposal Records */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {records.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-700">0 Quarantine Logs Found</p>
              <p className="text-xs text-slate-400">All quarantine, disposal, and return actions will be audited here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Medicine & Batch</th>
                    <th className="px-4 py-3 text-center">Units</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Handled By</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString()} {new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                            r.action === 'Disposed'
                              ? 'bg-rose-100 text-rose-800'
                              : r.action === 'Returned to Supplier'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{r.medicineName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Batch: {r.batchNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">{r.quantity}</td>
                      <td className="px-4 py-3 text-slate-700">{r.reason}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium">{r.quarantinedBy?.staffName}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{r.quarantinedBy?.role}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {actionModal.type === 'quarantine'
                    ? 'Move Batch to Quarantine'
                    : actionModal.type === 'dispose'
                    ? 'Dispose / Write Off Quarantined Stock'
                    : 'Return Stock to Supplier'}
                </h3>
              </div>
              <button
                onClick={() => setActionModal({ isOpen: false, type: '', batch: null })}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="p-6 space-y-4">
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

              {/* Batch Info Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{actionModal.batch?.medicineId?.name || 'Medicine'}</span>
                  <span className="font-mono text-emerald-700">Batch: {actionModal.batch?.batchNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Units to Process:</span>
                  <span className="font-bold">{actionModal.batch?.quantity} units</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Expiry Date:</span>
                  <span>{actionModal.batch && new Date(actionModal.batch.expiryDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Action *
                </label>
                <input
                  type="text"
                  required
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {actionModal.type === 'return'
                    ? 'Credit Note # / Supplier Memo'
                    : actionModal.type === 'dispose'
                    ? 'Disposal Protocol / Incineration Ref #'
                    : 'Notes / Storage Location'}
                </label>
                <input
                  type="text"
                  placeholder={actionModal.type === 'return' ? 'e.g., CN-2026-0812' : 'e.g., HazMat Bin #3'}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModal({ isOpen: false, type: '', batch: null })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all disabled:opacity-50 ${
                    actionModal.type === 'dispose'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : actionModal.type === 'return'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {submitting ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpiredQuarantinePage;
