import React, { useState, useEffect } from 'react';
import { Pill, Search, Plus, Edit2, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MedicinesPage = () => {
  const { isAdmin } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await api.getMedicines(search ? `search=${encodeURIComponent(search)}` : '');
      setMedicines(res.medicines || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this medicine?')) return;
    try {
      await api.deleteMedicine(id);
      fetchMedicines();
    } catch (err) {
      alert(err.message || 'Error deleting medicine');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Pill className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medicines Catalog</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered pharmaceutical items, dosages, packaging, and reorder levels.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchMedicines();
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search medicine catalog..."
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
            <p className="text-xs">Loading medicine catalog...</p>
          </div>
        ) : medicines.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Pill className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">Catalog is empty</p>
            <p className="text-xs text-slate-400">Scan or register new medicines to populate catalog.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Medicine Name</th>
                  <th className="px-4 py-3">Generic Name</th>
                  <th className="px-4 py-3">Dosage / Form</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3 text-center">Reorder Threshold</th>
                  <th className="px-4 py-3 text-center">Max Stock</th>
                  {isAdmin && <th className="px-4 py-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{m.name}</p>
                      <p className="text-[10px] text-slate-400">{m.manufacturer || 'Manufacturer N/A'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{m.genericName || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{m.dosageForm} {m.strength && `(${m.strength})`}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                        {m.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">{m.barcode || '—'}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-amber-600">{m.reorderLevel}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800">{m.maximumStock}</td>
                    {isAdmin && (
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleDelete(m._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Deactivate Medicine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
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

export default MedicinesPage;
