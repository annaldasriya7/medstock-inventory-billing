import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  Search,
  Eye,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  IndianRupee,
  Calendar,
  Filter,
  Package
} from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from '../components/common/ReceiptModal';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    SALE: { count: 0, amount: 0 },
    PURCHASE: { count: 0, amount: 0 },
    RETURN: { count: 0, amount: 0 }
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'All') params.append('type', typeFilter);
      if (search.trim()) params.append('search', search.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.getTransactions(params.toString());
      setTransactions(res.transactions || []);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'SALE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 rounded-full">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            <span>SALE</span>
          </span>
        );
      case 'PURCHASE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 bg-blue-100 rounded-full">
            <ArrowDownLeft className="w-3 h-3 text-blue-600" />
            <span>PURCHASE</span>
          </span>
        );
      case 'RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 bg-rose-100 rounded-full">
            <RotateCcw className="w-3 h-3 text-rose-600" />
            <span>RETURN</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-100 rounded-full">
            {type || 'SALE'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Unified Transactions</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete pharmacy audit trail across customer sales, inbound purchases, and customer returns.
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Statistics Cards (Requirement 9) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Sales Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Sales</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{summary.SALE?.amount?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {summary.SALE?.count || 0} completed customer bills
          </p>
        </div>

        {/* Purchases Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Purchases</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{summary.PURCHASE?.amount?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {summary.PURCHASE?.count || 0} supplier inbound deliveries
          </p>
        </div>

        {/* Returns Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Returns</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{summary.RETURN?.amount?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {summary.RETURN?.count || 0} refunded customer returns
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, reference, customer or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['All', 'SALE', 'PURCHASE', 'RETURN'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  typeFilter === t
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t === 'All' ? 'All Types' : t}
              </button>
            ))}
          </div>

          {/* Date Range */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:outline-none"
            title="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:outline-none"
            title="End Date"
          />
        </div>
      </div>

      {/* Transactions Table */}
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
            <p className="text-xs text-slate-400">
              No sales, purchases, or returns found matching your filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Reference No.</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Party (Customer / Supplier)</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Staff / Handled By</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {t.transactionNumber}
                      {t.originalTransactionNumber && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Ref: {t.originalTransactionNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getTypeBadge(t.transactionType || 'SALE')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(t.date || t.createdAt).toLocaleDateString()}{' '}
                      {new Date(t.date || t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{t.customerName || 'Walk-in Customer'}</p>
                      {t.customerPhone && <p className="text-[10px] text-slate-400">{t.customerPhone}</p>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {t.items?.length || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      <span className={t.transactionType === 'RETURN' ? 'text-rose-600' : 'text-slate-900'}>
                        {t.transactionType === 'RETURN' ? '-' : ''}₹{t.grandTotal?.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-medium text-slate-800">{t.staffName || 'Staff'}</span>
                      <span className="block text-[10px] text-slate-400 capitalize">{t.staffRole || 'Cashier'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedTxn(t)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 mx-auto transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
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
