import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Boxes,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  AlertTriangle,
  ShoppingCart,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  PackagePlus
} from 'lucide-react';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';

const InventoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (category !== 'All') params.append('category', category);
      if (status !== 'All') params.append('status', status);
      params.append('page', page);
      params.append('limit', 20);

      const res = await api.getMedicines(params.toString());
      setMedicines(res.medicines || []);
      setTotalCount(res.total || 0);
      setTotalPages(res.pages || 1);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, category, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInventory();
  };

  // Status Badge Helper
  const getStatusBadge = (st) => {
    switch (st) {
      case 'Healthy':
        return <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 rounded-full">Healthy</span>;
      case 'Low':
        return <span className="px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 rounded-full">Low Stock</span>;
      case 'Critical':
        return <span className="px-2 py-0.5 text-[10px] font-bold text-rose-800 bg-rose-100 rounded-full animate-pulse">Critical</span>;
      case 'Out of Stock':
        return <span className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-200 rounded-full">Out of Stock</span>;
      case 'Overstocked':
        return <span className="px-2 py-0.5 text-[10px] font-bold text-blue-800 bg-blue-100 rounded-full">Overstocked</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-full">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medicine Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-batch inventory stock, FEFO expiry tracking, and status alerts ({totalCount} total)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/stock-receiving')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-xs"
          >
            <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Receive Stock</span>
          </button>
          <button
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add / Scan Medicine</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search medicine, generic, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="All">All Categories</option>
            <option value="Analgesics">Analgesics</option>
            <option value="Antibiotics">Antibiotics</option>
            <option value="Antipyretics">Antipyretics</option>
            <option value="Cardiovascular">Cardiovascular</option>
            <option value="Diabetes">Diabetes</option>
            <option value="Respiratory">Respiratory</option>
            <option value="General">General</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="All">All Stock Statuses</option>
            <option value="Healthy">Healthy</option>
            <option value="Low">Low Stock</option>
            <option value="Critical">Critical Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Overstocked">Overstocked</option>
          </select>
        </div>
      </div>

      {/* Inventory Table (Requirement 13) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
            <p className="text-xs">Loading inventory telemetry...</p>
          </div>
        ) : medicines.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Boxes className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">No medicines found</p>
            <p className="text-xs max-w-sm mx-auto text-slate-400">
              Database currently contains 0 records matching your query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Medicine & Dosage</th>
                  <th className="px-4 py-3">Generic / Brand</th>
                  <th className="px-4 py-3 text-center">Active Batches</th>
                  <th className="px-4 py-3 text-center">Total Quantity</th>
                  <th className="px-4 py-3">Nearest Expiry</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-center">Stock Status</th>
                  <th className="px-4 py-3 text-center">Expiry Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((med) => (
                  <tr key={med._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{med.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {med.barcode ? `Barcode: ${med.barcode}` : med.category} • {med.dosageForm}
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-700">{med.genericName || '—'}</p>
                      <p className="text-[10px] text-slate-400">{med.brand || 'Generic'}</p>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {med.activeBatchesCount} / {med.batchesCount}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm font-extrabold text-slate-900">{med.totalStock}</span>
                      <p className="text-[10px] text-slate-400">Reorder at: {med.reorderLevel}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      {med.nearestExpiry ? (
                        <div>
                          <p className="font-medium text-slate-800">
                            {new Date(med.nearestExpiry).toLocaleDateString()}
                          </p>
                          <span className="text-[10px] text-slate-400">FEFO priority</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                      ₹{med.sellingPrice?.toFixed(2)}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {getStatusBadge(med.stockStatus)}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        med.expiryStatus === 'Critical Near Expiry'
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : med.expiryStatus === 'Near Expiry'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {med.expiryStatus}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          disabled={med.totalStock <= 0}
                          onClick={() => {
                            addToCart(med, 1);
                            navigate('/pos');
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-30"
                          title="Add to Sale Cart"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/batches?medicineId=${med._id}`)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Batches"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
