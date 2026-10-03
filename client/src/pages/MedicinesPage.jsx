import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  X,
  FileText,
  AlertCircle,
  Thermometer,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const INITIAL_FORM = {
  name: '',
  genericName: '',
  brand: '',
  dosageForm: 'Tablet',
  strength: '',
  category: 'General',
  manufacturer: '',
  barcode: '',
  unitOfMeasurement: 'Strip',
  reorderLevel: 20,
  maximumStock: 500,
  storageCondition: 'Room Temperature',
  prescriptionRequired: false,
  description: ''
};

const MedicinesPage = () => {
  const { isAdmin } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [rxFilter, setRxFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter !== 'All') params.append('category', categoryFilter);
      if (rxFilter !== 'All') params.append('prescriptionRequired', rxFilter === 'Yes');

      const res = await api.getMedicines(params.toString());
      setMedicines(res.medicines || []);
    } catch (err) {
      console.error('Failed to load medicines catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [categoryFilter, rxFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMedicines();
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedId(null);
    setFormData(INITIAL_FORM);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m) => {
    setIsEditing(true);
    setSelectedId(m._id);
    setFormData({
      name: m.name || '',
      genericName: m.genericName || '',
      brand: m.brand || '',
      dosageForm: m.dosageForm || 'Tablet',
      strength: m.strength || '',
      category: m.category || 'General',
      manufacturer: m.manufacturer || '',
      barcode: m.barcode || '',
      unitOfMeasurement: m.unitOfMeasurement || 'Strip',
      reorderLevel: m.reorderLevel !== undefined ? m.reorderLevel : 20,
      maximumStock: m.maximumStock !== undefined ? m.maximumStock : 500,
      storageCondition: m.storageCondition || 'Room Temperature',
      prescriptionRequired: Boolean(m.prescriptionRequired),
      description: m.description || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Medicine name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      if (isEditing) {
        await api.updateMedicine(selectedId, formData);
      } else {
        await api.createMedicine(formData);
      }

      setIsModalOpen(false);
      fetchMedicines();
    } catch (err) {
      setFormError(err.message || 'Failed to save medicine.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this medicine from the catalog?')) return;
    try {
      await api.deleteMedicine(id);
      fetchMedicines();
    } catch (err) {
      alert(err.message || 'Error deleting medicine');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Pill className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medicine Catalog</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Master medicine definitions, dosage forms, categories, and regulatory specifications (separate from batch inventory).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMedicines}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Medicine to Catalog</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search medicine, generic, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
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

          {/* Prescription Required Filter */}
          <select
            value={rxFilter}
            onChange={(e) => setRxFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
          >
            <option value="All">All Prescription Statuses</option>
            <option value="Yes">Rx Required Only</option>
            <option value="No">Over-the-Counter (OTC)</option>
          </select>
        </div>
      </div>

      {/* Medicines Catalog Table */}
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
            <p className="text-xs text-slate-400">
              No medicines found. Click "Add Medicine to Catalog" to register new items.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Medicine & Strength</th>
                  <th className="px-4 py-3">Generic Name</th>
                  <th className="px-4 py-3">Dosage & Unit</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3 text-center">Rx Required</th>
                  <th className="px-4 py-3 text-center">Reorder Lvl</th>
                  <th className="px-4 py-3 text-center">Storage</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{m.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {m.manufacturer || 'Manufacturer N/A'} {m.strength && `• ${m.strength}`}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{m.genericName || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <span className="font-medium">{m.dosageForm}</span>
                      <span className="block text-[10px] text-slate-400">Unit: {m.unitOfMeasurement || 'Strip'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                        {m.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">{m.barcode || '—'}</td>
                    <td className="px-4 py-3.5 text-center">
                      {m.prescriptionRequired ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold text-rose-800 bg-rose-100 rounded-full">
                          Rx
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 rounded-full">
                          OTC
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-amber-600">{m.reorderLevel}</td>
                    <td className="px-4 py-3.5 text-center text-slate-600 text-[10px]">
                      {m.storageCondition || 'Room Temp'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Medicine"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(m._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Deactivate Medicine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Medicine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {isEditing ? 'Edit Medicine Master Record' : 'Register New Medicine in Catalog'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Brand / Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Medicine / Brand Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Paracetamol 500 or Crocin"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Generic Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Paracetamol"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Dosage Form */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dosage Form</label>
                  <select
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Drops">Drops</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Powder">Powder</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Strength */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Strength / Concentration</label>
                  <input
                    type="text"
                    placeholder="e.g., 500mg, 250mg/5ml, 10ml"
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Therapeutic Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Analgesics">Analgesics</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Antipyretics">Antipyretics</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Respiratory">Respiratory</option>
                  </select>
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g., Sun Pharma, Cipla"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                {/* Barcode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Barcode / QR Code</label>
                  <input
                    type="text"
                    placeholder="e.g., 8901234567890"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                  />
                </div>

                {/* Unit of Measurement */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measurement</label>
                  <select
                    value={formData.unitOfMeasurement}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasurement: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="Strip">Strip</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Vial">Vial</option>
                    <option value="Box">Box</option>
                    <option value="Piece">Piece</option>
                    <option value="Tube">Tube</option>
                    <option value="Ampoule">Ampoule</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Reorder Level */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reorder Threshold Units</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
                  />
                </div>

                {/* Maximum Stock */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Maximum Stock Units</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maximumStock}
                    onChange={(e) => setFormData({ ...formData, maximumStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
                  />
                </div>

                {/* Storage Condition */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Storage Condition</label>
                  <select
                    value={formData.storageCondition}
                    onChange={(e) => setFormData({ ...formData, storageCondition: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="Room Temperature">Room Temperature</option>
                    <option value="Refrigerated (2°C - 8°C)">Refrigerated (2°C - 8°C)</option>
                    <option value="Cool & Dry (<25°C)">Cool & Dry (&lt;25°C)</option>
                    <option value="Deep Freeze">Deep Freeze</option>
                  </select>
                </div>

                {/* Prescription Required */}
                <div className="flex items-center h-full pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.prescriptionRequired}
                      onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Prescription Required (Schedule H/X)</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Optional clinical notes or directions..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Update Medicine' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicinesPage;
