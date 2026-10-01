import React, { useState, useEffect } from 'react';
import { ReceiptText, Search, Printer, Eye, RefreshCw, X, Calendar, IndianRupee } from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from '../components/common/ReceiptModal';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions(search ? `search=${encodeURIComponent(search)}` : '');
      setTransactions(res.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Transactions</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit history of completed billing orders, dispensed batches, and revenue.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTransactions();
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
            <p className="text-xs">Loading transaction logs...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ReceiptText className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">0 Transactions Found</p>
            <p className="text-xs text-slate-400">Perform a sale on the POS page to record transactions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-center">Items Sold</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{t.transactionNumber}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{t.customerName}</p>
                      {t.customerPhone && <p className="text-[10px] text-slate-400">{t.customerPhone}</p>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{t.items?.length || 0}</td>
                    <td className="px-4 py-3 font-semibold uppercase text-slate-600">{t.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">₹{t.grandTotal?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">{t.staffName || 'Staff'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedTxn(t)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTxn && (
        <ReceiptModal transaction={selectedTxn} onClose={() => setSelectedTxn(null)} />
      )}
    </div>
  );
};

export default TransactionsPage;
