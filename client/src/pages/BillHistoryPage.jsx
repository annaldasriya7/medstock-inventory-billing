import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  Search,
  Printer,
  Eye,
  RefreshCw,
  Calendar,
  IndianRupee,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  CheckCircle,
  X,
  UserCheck,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BillHistoryPage = () => {
  const { user: currentUser } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Bill for View / Reprint
  const [selectedBill, setSelectedBill] = useState(null);
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
  const [reprintFeedback, setReprintFeedback] = useState('');

  // Sales Return State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnBill, setReturnBill] = useState(null);
  const [returnItemIndex, setReturnItemIndex] = useState(0);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('Customer return');
  const [returnCondition, setReturnCondition] = useState('Resellable');
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState('');
  const [returnSuccess, setReturnSuccess] = useState('');

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (paymentFilter !== 'All') params.append('paymentMethod', paymentFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.getTransactions(params.toString());
      setBills(res.transactions || []);
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [paymentFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBills();
  };

  // Safe reprint: triggers audit log recording on server WITHOUT altering stock or consumption
  const handleReprint = async (bill) => {
    try {
      setSelectedBill(bill);
      setIsReprintModalOpen(true);
      setReprintFeedback('Recording reprint activity in audit log...');

      // Notify backend to log reprint
      await api.logBillReprint(bill._id);
      setReprintFeedback('Audit log verified. Ready to print.');
    } catch (err) {
      console.error('Failed to log reprint:', err);
      setReprintFeedback('Audit log error, proceeding with print.');
    }
  };

  const executePrint = () => {
    window.print();
  };

  const openReturnModal = (bill) => {
    setReturnBill(bill);
    setReturnItemIndex(0);
    setReturnQty(1);
    setReturnReason('Customer return');
    setReturnCondition('Resellable');
    setReturnNotes('');
    setReturnError('');
    setReturnSuccess('');
    setIsReturnModalOpen(true);
  };

  const submitReturn = async (e) => {
    e.preventDefault();
    if (!returnBill || !returnBill.items || returnBill.items.length === 0) return;

    const item = returnBill.items[returnItemIndex];
    if (!item) return;

    const maxReturnable = item.quantity - (item.returnedQuantity || 0);
    if (returnQty <= 0 || returnQty > maxReturnable) {
      setReturnError(`Please enter a valid return quantity between 1 and ${maxReturnable}.`);
      return;
    }

    try {
      setSubmittingReturn(true);
      setReturnError('');
      const res = await api.processSalesReturn(returnBill._id, {
        medicineId: item.medicineId,
        batchId: item.batchId,
        returnQuantity: Number(returnQty),
        reason: returnReason,
        condition: returnCondition,
        notes: returnNotes
      });

      setReturnSuccess(res.message || 'Sales return processed successfully.');
      setTimeout(() => {
        setIsReturnModalOpen(false);
        fetchBills();
      }, 1500);
    } catch (err) {
      setReturnError(err.message || 'Failed to process sales return.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Calculate Today's Summary Metrics
  const todayStr = new Date().toDateString();
  const todayBills = bills.filter((b) => new Date(b.date || b.createdAt).toDateString() === todayStr);

  const todayCount = todayBills.length;
  const todayRevenue = todayBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);

  const todayCash = todayBills
    .filter((b) => b.paymentMethod?.toLowerCase() === 'cash')
    .reduce((sum, b) => sum + (b.grandTotal || 0), 0);

  const todayCard = todayBills
    .filter((b) => b.paymentMethod?.toLowerCase() === 'card')
    .reduce((sum, b) => sum + (b.grandTotal || 0), 0);

  const todayUPI = todayBills
    .filter((b) => b.paymentMethod?.toLowerCase() === 'upi')
    .reduce((sum, b) => sum + (b.grandTotal || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bill History & Reprint</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit customer invoices, look up past sales by cashier or bill number, and safely reprint receipts.
          </p>
        </div>

        <button
          onClick={fetchBills}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Bills</span>
        </button>
      </div>

      {/* Today's Sales Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today's Total Bills</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{todayCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Orders billed today</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today's Revenue</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{todayRevenue.toFixed(2)}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Net sales collection</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Cash Collections</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">₹{todayCash.toFixed(2)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Cash drawer intake</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Digital (UPI & Card)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">₹{(todayCard + todayUPI).toFixed(2)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            UPI: ₹{todayUPI.toFixed(2)} • Card: ₹{todayCard.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, customer name, phone, or cashier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700"
          >
            <option value="All">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-600"
            title="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-600"
            title="End Date"
          />
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
            <p className="text-xs">Loading billing transactions...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ReceiptText className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">0 Invoices Found</p>
            <p className="text-xs text-slate-400">Invoices generated at the POS will appear in this history.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Billed By</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.transactionNumber}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(b.date || b.createdAt).toLocaleDateString()} {new Date(b.date || b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{b.customerName || 'Walk-in Patient'}</div>
                      {b.customerPhone && <div className="text-[10px] text-slate-400">{b.customerPhone}</div>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{b.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      ₹{b.grandTotal?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          b.paymentMethod?.toLowerCase() === 'cash'
                            ? 'bg-amber-100 text-amber-800'
                            : b.paymentMethod?.toLowerCase() === 'card'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {b.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{b.staffName || 'Staff'}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{b.staffRole || 'Cashier'}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedBill(b);
                            setIsReprintModalOpen(true);
                            setReprintFeedback('');
                          }}
                          className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                          title="View Bill Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleReprint(b)}
                          className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1"
                          title="Reprint Receipt (Without Altering Stock)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reprint</span>
                        </button>
                        <button
                          onClick={() => openReturnModal(b)}
                          disabled={b.status === 'Refunded'}
                          className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 disabled:opacity-40"
                          title="Process Sales Return"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Return</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill View & Reprint Modal */}
      {isReprintModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header Actions (Not Printed) */}
            <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Tax Invoice #{selectedBill.transactionNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={executePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setIsReprintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reprint Status Notice */}
            {reprintFeedback && (
              <div className="no-print px-6 py-2 bg-emerald-50 border-b border-emerald-100 text-[11px] text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{reprintFeedback} (No stock deducted; no duplicate record created).</span>
              </div>
            )}

            {/* Printable Receipt Body */}
            <div id="printable-receipt" className="p-6 text-slate-800 text-xs">
              {/* Pharmacy Header */}
              <div className="text-center pb-4 border-b border-dashed border-slate-300">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                  MedStock AI Pharmacy
                </h2>
                <p className="text-[11px] text-slate-500">101 Medical Enclave, Health City</p>
                <p className="text-[11px] text-slate-500">Phone: +91 98765 43210 | GSTIN: GSTIN29ABCDE1234F1Z5</p>
                <div className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono font-semibold text-[10px]">
                  TAX INVOICE / CASH MEMO
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 gap-2 py-3 border-b border-dashed border-slate-300 text-[11px]">
                <div>
                  <p><span className="text-slate-500">Invoice:</span> <span className="font-mono font-bold">{selectedBill.transactionNumber}</span></p>
                  <p><span className="text-slate-500">Date:</span> {new Date(selectedBill.date || selectedBill.createdAt).toLocaleDateString()} {new Date(selectedBill.date || selectedBill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p><span className="text-slate-500">Customer:</span> <span className="font-medium">{selectedBill.customerName || 'Walk-in'}</span></p>
                  {selectedBill.customerPhone && <p><span className="text-slate-500">Phone:</span> {selectedBill.customerPhone}</p>}
                  <p><span className="text-slate-500">Payment:</span> <span className="font-semibold uppercase">{selectedBill.paymentMethod}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-3 border-b border-dashed border-slate-300">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-200 text-[10px] uppercase">
                      <th className="pb-1.5">Item & Batch</th>
                      <th className="pb-1.5 text-center">Qty</th>
                      <th className="pb-1.5 text-right">Rate</th>
                      <th className="pb-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBill.items?.map((item, idx) => (
                      <tr key={idx} className="text-[11px]">
                        <td className="py-2 pr-2">
                          <p className="font-semibold text-slate-800">{item.medicineName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Batch: {item.batchNumber} {item.expiryDate && `(Exp: ${new Date(item.expiryDate).toLocaleDateString()})`}
                          </p>
                        </td>
                        <td className="py-2 text-center font-medium">{item.quantity}</td>
                        <td className="py-2 text-right">₹{item.unitPrice?.toFixed(2)}</td>
                        <td className="py-2 text-right font-medium">₹{item.subtotal?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="py-3 space-y-1 text-right text-[11px] border-b border-dashed border-slate-300">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span>₹{selectedBill.subtotal?.toFixed(2)}</span>
                </div>
                {selectedBill.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount Applied:</span>
                    <span>-₹{selectedBill.discount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>GST / Tax:</span>
                  <span>+₹{selectedBill.tax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Net Grand Total:</span>
                  <span>₹{selectedBill.grandTotal?.toFixed(2)}</span>
                </div>
              </div>

              {/* Compliance & Verification Footer */}
              <div className="pt-4 text-center text-[10px] text-slate-400 space-y-1">
                <div className="flex items-center justify-center gap-1 text-emerald-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Dispensed via First-Expire, First-Out (FEFO) Protocol</span>
                </div>
                <p>This is a computer generated copy / reprint of invoice.</p>
                <p>Thank you for choosing MedStock AI!</p>
              </div>
            </div>

            {/* Modal Bottom Actions (Not Printed) */}
            <div className="no-print p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsReprintModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={executePrint}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Return Modal */}
      {isReturnModalOpen && returnBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Sales Return — Bill #{returnBill.transactionNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Customer: {returnBill.customerName || 'Walk-in'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitReturn} className="p-6 space-y-4">
              {returnError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{returnError}</span>
                </div>
              )}

              {returnSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{returnSuccess}</span>
                </div>
              )}

              {/* Item Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Medicine to Return</label>
                <select
                  value={returnItemIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setReturnItemIndex(idx);
                    const it = returnBill.items[idx];
                    const max = it ? it.quantity - (it.returnedQuantity || 0) : 1;
                    setReturnQty(Math.min(1, Math.max(1, max)));
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  {returnBill.items?.map((item, idx) => {
                    const remaining = item.quantity - (item.returnedQuantity || 0);
                    return (
                      <option key={idx} value={idx} disabled={remaining <= 0}>
                        {item.medicineName} (Batch: {item.batchNumber}) — Sold: {item.quantity}, Returnable: {remaining} {remaining <= 0 ? '(Fully Returned)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Current Item Info Card */}
              {returnBill.items && returnBill.items[returnItemIndex] && (() => {
                const curItem = returnBill.items[returnItemIndex];
                const remaining = curItem.quantity - (curItem.returnedQuantity || 0);
                const refundTotal = (Math.min(returnQty, remaining) * (curItem.unitPrice || 0)).toFixed(2);

                return (
                  <>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Sold Qty</span>
                        <span className="font-bold text-slate-800">{curItem.quantity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Already Returned</span>
                        <span className="font-bold text-slate-600">{curItem.returnedQuantity || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Unit Rate</span>
                        <span className="font-bold text-slate-800">₹{curItem.unitPrice?.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Return Quantity Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Return Quantity (Max: {remaining})
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={remaining}
                        value={returnQty}
                        onChange={(e) => setReturnQty(Math.max(1, Math.min(remaining, Number(e.target.value))))}
                        disabled={remaining <= 0}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold"
                        required
                      />
                    </div>

                    {/* Reason Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Return</label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      >
                        <option value="Customer return">Customer return (Unopened / Not needed)</option>
                        <option value="Wrong item">Wrong item dispensed</option>
                        <option value="Damaged item">Damaged item / Seal compromised</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Condition: Resellable vs Damaged */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Medicine Physical Condition</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className={`p-2.5 border rounded-xl cursor-pointer flex flex-col gap-1 transition-all ${
                          returnCondition === 'Resellable'
                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-1 ring-emerald-500'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}>
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <input
                              type="radio"
                              name="condition"
                              value="Resellable"
                              checked={returnCondition === 'Resellable'}
                              onChange={() => setReturnCondition('Resellable')}
                              className="text-emerald-600"
                            />
                            <span>Resellable</span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Safe & sealed. Restores stock to batch inventory.
                          </span>
                        </label>

                        <label className={`p-2.5 border rounded-xl cursor-pointer flex flex-col gap-1 transition-all ${
                          returnCondition === 'Damaged / Unusable'
                            ? 'border-rose-500 bg-rose-50/50 text-rose-900 ring-1 ring-rose-500'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}>
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <input
                              type="radio"
                              name="condition"
                              value="Damaged / Unusable"
                              checked={returnCondition === 'Damaged / Unusable'}
                              onChange={() => setReturnCondition('Damaged / Unusable')}
                              className="text-rose-600"
                            />
                            <span>Damaged / Unusable</span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Opened or defective. Does NOT restore to inventory.
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Calculated Refund Banner */}
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-900">Total Refund Due:</span>
                      <span className="text-base font-extrabold text-purple-900 font-mono">
                        ₹{refundTotal}
                      </span>
                    </div>

                    {/* Optional Notes */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
                      <input
                        type="text"
                        placeholder="Optional remarks regarding return condition..."
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>

                    {/* Submit Actions */}
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsReturnModalOpen(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingReturn || remaining <= 0}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm disabled:opacity-40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{submittingReturn ? 'Processing...' : `Refund ₹${refundTotal}`}</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillHistoryPage;
