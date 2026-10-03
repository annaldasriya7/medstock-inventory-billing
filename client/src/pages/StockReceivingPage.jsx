import React, { useState, useEffect } from 'react';
import {
  PackagePlus,
  Truck,
  Boxes,
  Calendar,
  IndianRupee,
  Search,
  Plus,
  RefreshCw,
  X,
  CheckCircle,
  AlertTriangle,
  Eye,
  FileText,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const StockReceivingPage = () => {
  const { user: currentUser } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Form State
  const [isNewMedicine, setIsNewMedicine] = useState(false);
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierId: '',
    invoiceNumber: '',
    medicineId: '',
    medicineName: '',
    category: 'General',
    dosageForm: 'Tablet',
    strength: '',
    minStockAlert: 15,
    batchNumber: '',
    quantity: '',
    purchasePrice: '',
    sellingPrice: '',
    manufacturingDate: '',
    expiryDate: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [receiptsRes, medsRes, supRes] = await Promise.all([
        api.getStockReceipts(search ? `search=${encodeURIComponent(search)}` : ''),
        api.getMedicines('limit=200'),
        api.getSuppliers('limit=200')
      ]);

      setReceipts(receiptsRes.receipts || []);
      setMedicines(medsRes.medicines || []);
      setSuppliers(supRes.suppliers || []);
    } catch (err) {
      console.error('Error loading receiving data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const openReceiveModal = () => {
    setFormData({
      supplierName: '',
      supplierId: '',
      invoiceNumber: '',
      medicineId: '',
      medicineName: '',
      category: 'General',
      dosageForm: 'Tablet',
      strength: '',
      minStockAlert: 15,
      batchNumber: '',
      quantity: '',
      purchasePrice: '',
      sellingPrice: '',
      manufacturingDate: '',
      expiryDate: '',
      notes: ''
    });
    setIsNewMedicine(false);
    setFeedback({ type: '', text: '' });
    setIsReceiveModalOpen(true);
  };

  const handleMedicineSelect = (medId) => {
    const med = medicines.find((m) => m._id === medId);
    if (med) {
      setFormData((prev) => ({
        ...prev,
        medicineId: med._id,
        medicineName: med.name,
        category: med.category || 'General',
        dosageForm: med.dosageForm || 'Tablet',
        strength: med.strength || '',
        sellingPrice: med.unitPrice || ''
      }));
    }
  };

  const handleSupplierSelect = (supId) => {
    const sup = suppliers.find((s) => s._id === supId);
    if (sup) {
      setFormData((prev) => ({
        ...prev,
        supplierId: sup._id,
        supplierName: sup.name
      }));
    }
  };

  const handleSubmitReceive = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ type: '', text: '' });

    try {
      const payload = {
        supplierName: formData.supplierName,
        supplierId: formData.supplierId || null,
        invoiceNumber: formData.invoiceNumber,
        batchNumber: formData.batchNumber,
        quantity: Number(formData.quantity),
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        manufacturingDate: formData.manufacturingDate || null,
        expiryDate: formData.expiryDate,
        notes: formData.notes
      };

      if (isNewMedicine) {
        payload.medicineName = formData.medicineName;
        payload.category = formData.category;
        payload.dosageForm = formData.dosageForm;
        payload.strength = formData.strength;
        payload.minStockAlert = Number(formData.minStockAlert);
      } else {
        payload.medicineId = formData.medicineId;
        payload.medicineName = formData.medicineName;
      }

      await api.receiveStock(payload);
      setFeedback({ type: 'success', text: 'Stock received and inventory successfully updated!' });

      await loadData();
      setTimeout(() => {
        setIsReceiveModalOpen(false);
      }, 1200);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to receive stock.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Summary Metrics
  const totalReceipts = receipts.length;
  const totalValueReceived = receipts.reduce((acc, r) => acc + (r.totalPurchaseValue || 0), 0);
  const totalUnitsReceived = receipts.reduce((acc, r) => acc + (r.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <PackagePlus className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase / Stock Receiving</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record supplier deliveries, create or update batch inventory, and track inbound invoices.
          </p>
        </div>

        <button
          onClick={openReceiveModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Receive Inbound Stock</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Purchase Deliveries</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalReceipts}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Units Received</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalUnitsReceived}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Inbound Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalValueReceived.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* History Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search receipt #, supplier, medicine, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </form>

        <button
          onClick={loadData}
          className="p-2 text-slate-600 hover:text-emerald-600 bg-slate-50 border border-slate-200 rounded-xl"
          title="Refresh History"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Receiving History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
            <p className="text-xs">Loading inbound stock receipts...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <PackagePlus className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">0 Stock Receipts Found</p>
            <p className="text-xs text-slate-400">Click "Receive Inbound Stock" above to record arriving deliveries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Receipt / Date</th>
                  <th className="px-4 py-3">Supplier & Invoice</th>
                  <th className="px-4 py-3">Medicine & Batch</th>
                  <th className="px-4 py-3 text-center">Qty Received</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Total Cost</th>
                  <th className="px-4 py-3">Received By</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900">{r.receiptNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(r.receivedDate).toLocaleDateString()} {new Date(r.receivedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{r.supplierName}</div>
                      {r.invoiceNumber && <div className="text-[11px] text-slate-500 font-mono">Inv #{r.invoiceNumber}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.medicineName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Batch: <span className="font-bold text-slate-700">{r.batchNumber}</span> (Exp: {new Date(r.expiryDate).toLocaleDateString()})
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        +{r.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">₹{r.purchasePrice?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      ₹{r.totalPurchaseValue?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{r.receivedBy?.staffName || 'Staff'}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{r.receivedBy?.role || 'Staff'}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedReceipt(r)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receive Stock Modal */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Receive Inbound Supplier Stock</h3>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReceive} className="p-6 space-y-4">
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

              {/* Logged in Staff Badge */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-600">Receiving Staff:</span>
                  <span className="font-bold text-slate-800">{currentUser?.name}</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-700">
                  {currentUser?.role || 'Staff'}
                </span>
              </div>

              {/* Supplier Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier / Distributor *
                  </label>
                  {suppliers.length > 0 ? (
                    <div className="space-y-1">
                      <select
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setFormData({ ...formData, supplierId: '', supplierName: '' });
                          } else {
                            handleSupplierSelect(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      >
                        <option value="">Select Existing Supplier or Type</option>
                        {suppliers.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                        <option value="custom">+ Enter New Supplier Name</option>
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Enter Supplier Name"
                        value={formData.supplierName}
                        onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g., MedLife Pharmaceuticals"
                      value={formData.supplierName}
                      onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier Invoice / Bill No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., INV-2026-9021"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Medicine Selection vs New Medicine Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">Medicine Identification</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMedicine(!isNewMedicine);
                      setFormData({
                        ...formData,
                        medicineId: '',
                        medicineName: '',
                        sellingPrice: ''
                      });
                    }}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    {isNewMedicine ? '← Select Existing Medicine' : '+ Register Completely New Medicine'}
                  </button>
                </div>

                {!isNewMedicine ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Choose Medicine *
                    </label>
                    <select
                      required
                      value={formData.medicineId}
                      onChange={(e) => handleMedicineSelect(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    >
                      <option value="">-- Search & Select Medicine --</option>
                      {medicines.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.dosageForm || 'Tab'} {m.strength || ''}) - Current Stock: {m.totalStock || 0}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                    <p className="text-[11px] font-semibold text-emerald-800">
                      Scenario C: Register New Medicine into Catalog & Receive First Batch
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Medicine Brand Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Amoxicillin 500mg"
                          value={formData.medicineName}
                          onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category</label>
                        <input
                          type="text"
                          placeholder="e.g., Antibiotic"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dosage Form</label>
                        <select
                          value={formData.dosageForm}
                          onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                        >
                          <option value="Tablet">Tablet</option>
                          <option value="Capsule">Capsule</option>
                          <option value="Syrup">Syrup</option>
                          <option value="Injection">Injection</option>
                          <option value="Ointment">Ointment</option>
                          <option value="Drops">Drops</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Strength</label>
                        <input
                          type="text"
                          placeholder="e.g., 500mg"
                          value={formData.strength}
                          onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Batch & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., BATCH-AMX-202"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Received Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Units received"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Price / Unit (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Cost price"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price / MRP (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="MRP / Retail"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Calculated Total Value (₹)
                  </label>
                  <div className="px-3 py-2 text-xs font-bold text-slate-800 bg-slate-100 rounded-xl border border-slate-200 flex items-center h-[38px]">
                    ₹{((Number(formData.quantity) || 0) * (Number(formData.purchasePrice) || 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Delivery Remarks</label>
                <input
                  type="text"
                  placeholder="e.g., Delivered in sealed refrigerated transport pack"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Receiving & Updating Inventory...' : 'Confirm Stock Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Stock Receipt Details</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400">Receipt Ref:</span>
                  <p className="font-mono font-bold text-slate-800">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400">Invoice Number:</span>
                  <p className="font-mono font-bold text-slate-800">{selectedReceipt.invoiceNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Date Received:</span>
                  <p className="font-medium text-slate-700">{new Date(selectedReceipt.receivedDate).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-400">Received By:</span>
                  <p className="font-medium text-slate-700">
                    {selectedReceipt.receivedBy?.staffName} ({selectedReceipt.receivedBy?.role})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400">Supplier:</span>
                  <p className="font-bold text-slate-800">{selectedReceipt.supplierName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Medicine:</span>
                  <p className="font-bold text-slate-800">{selectedReceipt.medicineName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Batch Number:</span>
                  <p className="font-mono font-bold text-emerald-700">{selectedReceipt.batchNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400">Expiry Date:</span>
                  <p className="font-medium text-slate-700">{new Date(selectedReceipt.expiryDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Units Received:</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Purchase Price / Unit:</span>
                  <span className="font-semibold text-slate-800">₹{selectedReceipt.purchasePrice?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Selling Price / MRP:</span>
                  <span className="font-semibold text-slate-800">₹{selectedReceipt.sellingPrice?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Purchase Cost:</span>
                  <span>₹{selectedReceipt.totalPurchaseValue?.toFixed(2)}</span>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Notes:</span>
                  <p className="text-slate-700">{selectedReceipt.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockReceivingPage;
