import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Phone, Mail, Clock, Star, RefreshCw, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SuppliersPage = () => {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    leadTimeDays: 5
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.getSuppliers(search ? `search=${encodeURIComponent(search)}` : '');
      setSuppliers(res.suppliers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      await api.createSupplier(formData);
      setShowAddModal(false);
      setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', leadTimeDays: 5 });
      fetchSuppliers();
    } catch (err) {
      alert(err.message || 'Error creating supplier');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Supplier Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Vendor lead times, delivery performance, and procurement contact points.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchSuppliers();
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600" />
            <p className="text-xs">Loading supplier records...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
            <Truck className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">0 Suppliers Registered</p>
            <p className="text-xs text-slate-400">Database starts empty. Register a supplier to begin tracking lead times.</p>
          </div>
        ) : (
          suppliers.map((s) => (
            <div key={s._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                  <p className="text-xs text-slate-500">{s.contactPerson || 'Vendor Representative'}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{s.reliabilityRating || 4.5}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Lead Time: {s.leadTimeDays} days</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Add New Supplier</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold text-white bg-slate-900 rounded-xl">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
