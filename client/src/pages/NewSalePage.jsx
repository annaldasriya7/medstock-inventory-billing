import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  ScanLine,
  IndianRupee,
  Layers,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  CreditCard,
  QrCode,
  Banknote,
  Receipt
} from 'lucide-react';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import ReceiptModal from '../components/common/ReceiptModal';

const NewSalePage = () => {
  const {
    cartItems,
    addToCart,
    updateCartItemQty,
    removeFromCart,
    clearCart,
    cartSubtotal
  } = useCart();

  // Search & Catalog
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Billing Fields
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [taxRate, setTaxRate] = useState(12); // standard GST

  // FEFO Preview State
  const [fefoPreview, setFefoPreview] = useState(null);
  const [loadingFefo, setLoadingFefo] = useState(false);

  // Checkout State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [completedTransaction, setCompletedTransaction] = useState(null);

  // Load pharmacy settings for tax rate
  useEffect(() => {
    const fetchTaxRate = async () => {
      try {
        const res = await api.getSettings();
        if (res.settings?.taxRatePercent !== undefined) {
          setTaxRate(res.settings.taxRatePercent);
        }
      } catch (err) {
        console.warn('Could not load settings tax rate:', err.message);
      }
    };
    fetchTaxRate();
  }, []);

  // Quick medicine search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.getMedicines(`search=${encodeURIComponent(searchTerm.trim())}&limit=10`);
        setSearchResults(res.medicines || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // Barcode / Scanner Direct Enter
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      setErrorMessage('');
      const res = await api.scanLookup(barcodeInput.trim());
      if (res.found && res.medicine) {
        if (res.totalStock <= 0) {
          setErrorMessage(`"${res.medicine.name}" has 0 stock in inventory.`);
        } else {
          addToCart(res.medicine, 1);
          setBarcodeInput('');
        }
      } else {
        setErrorMessage(`Barcode "${barcodeInput}" not found in registered catalog.`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error looking up barcode.');
    }
  };

  // Preview FEFO Allocations
  const handlePreviewFefo = async () => {
    if (cartItems.length === 0) return;
    try {
      setLoadingFefo(true);
      setErrorMessage('');
      const payload = cartItems.map(item => ({
        medicineId: item.medicineId,
        quantity: item.quantity
      }));
      const res = await api.previewFefo(payload);
      setFefoPreview(res.preview);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to compute FEFO allocation.');
    } finally {
      setLoadingFefo(false);
    }
  };

  // Totals Calculation
  const discountAmount = parseFloat(((cartSubtotal * (Number(discountPercent) || 0)) / 100).toFixed(2));
  const taxableAmount = Math.max(0, cartSubtotal - discountAmount);
  const taxAmount = parseFloat(((taxableAmount * taxRate) / 100).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + taxAmount).toFixed(2));

  // Process Checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setErrorMessage('Cart is empty. Please add medicines before checkout.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');

      const salePayload = {
        items: cartItems.map(item => ({
          medicineId: item.medicineId,
          quantity: item.quantity
        })),
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || '',
        discountPercent: Number(discountPercent) || 0,
        paymentMethod
      };

      const res = await api.createSale(salePayload);

      // CRITICAL REQUIREMENT 16 & 48: CLEAR CART AFTER SUCCESSFUL SALE
      clearCart();
      setFefoPreview(null);
      setCompletedTransaction(res.transaction);

    } catch (err) {
      setErrorMessage(err.message || 'Checkout failed. Please verify batch stock.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Point of Sale (POS) Billing</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-100 rounded-full uppercase">
              FEFO Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cart starts empty. Scan or search medicines to add items, verify FEFO batches, and finalize transaction.
          </p>
        </div>

        {cartItems.length > 0 && (
          <button
            onClick={clearCart}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset / Clear Cart</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Left = Add & Cart, Right = Customer & Bill Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Selection & Cart Items (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Quick Input Barcode + Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            {/* Barcode Quick Scanner input */}
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Scan / Type Barcode + Enter"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </form>

            {/* Live Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by medicine name, generic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />

              {/* Search dropdown results */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((med) => (
                    <button
                      key={med._id}
                      type="button"
                      disabled={med.totalStock <= 0}
                      onClick={() => {
                        addToCart(med, 1);
                        setSearchTerm('');
                        setSearchResults([]);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs disabled:opacity-40 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{med.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {med.genericName} • {med.dosageForm} • {med.strength || ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-700">₹{med.sellingPrice?.toFixed(2)}</span>
                        <p className={`text-[10px] ${med.totalStock <= 0 ? 'text-rose-500 font-bold' : 'text-emerald-600'}`}>
                          {med.totalStock > 0 ? `${med.totalStock} in stock` : 'Out of stock'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Items Table (Requirement 16 & 48) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">Current Cart Items</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                {cartItems.length} distinct item(s)
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
                <p className="text-sm font-semibold text-slate-600">Cart is currently empty</p>
                <p className="text-xs max-w-sm mx-auto text-slate-400">
                  Scan a medicine barcode using the input above or search the inventory to add medicines to this bill.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase text-slate-400 bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3">Medicine</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-center">Quantity</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {cartItems.map((item) => (
                      <tr key={item.medicineId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.genericName || ''} {item.dosageForm ? `• ${item.dosageForm}` : ''}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-medium">
                            Available non-expired: {item.availableStock}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          ₹{item.unitPrice?.toFixed(2)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(item.medicineId, item.quantity - 1)}
                              className="p-1 text-slate-500 hover:text-slate-800 rounded bg-slate-100 hover:bg-slate-200"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.availableStock || 9999}
                              value={item.quantity}
                              onChange={(e) => updateCartItemQty(item.medicineId, parseInt(e.target.value) || 1)}
                              className="w-12 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(item.medicineId, item.quantity + 1)}
                              disabled={item.quantity >= item.availableStock}
                              className="p-1 text-slate-500 hover:text-slate-800 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          ₹{(item.quantity * item.unitPrice).toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.medicineId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FEFO Batch Inspection Preview Card (Requirement 14) */}
          {cartItems.length > 0 && (
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    FEFO Batch Allocation Inspector
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePreviewFefo}
                  disabled={loadingFefo}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors shadow-2xs"
                >
                  {loadingFefo ? 'Analyzing...' : 'Inspect Batches'}
                </button>
              </div>

              {fefoPreview ? (
                <div className="space-y-2 text-xs">
                  {fefoPreview.map((p, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-xl border border-emerald-200/60">
                      <p className="font-bold text-emerald-900">{p.medicineName} ({p.requestedQuantity} required):</p>
                      <ul className="mt-1 space-y-1 text-[11px] text-slate-600">
                        {p.allocations.map((alloc, aIdx) => (
                          <li key={aIdx} className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded">
                            <span className="font-mono text-emerald-800">
                              Batch: {alloc.batchNumber} (Exp: {new Date(alloc.expiryDate).toLocaleDateString()})
                            </span>
                            <span className="font-semibold text-slate-800">
                              Take {alloc.allocatedQuantity} units (Stock: {alloc.availableBefore} → {alloc.availableAfter})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-emerald-800">
                  Click "Inspect Batches" to preview the exact First-Expire-First-Out batch breakdown that will be depleted upon finalizing this checkout.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Customer Details, Discounts, Tax, Checkout (4/5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Customer & Checkout
            </h2>

            {/* Customer Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Customer Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe / Walk-in"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Customer Phone (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +91 98765 00000"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Payment Method (Cash / UPI / Card) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Cash', label: 'Cash', icon: Banknote },
                  { id: 'UPI', label: 'UPI', icon: QrCode },
                  { id: 'Card', label: 'Card', icon: CreditCard }
                ].map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discount Percentage */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Bill Summary Breakdown */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal:</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount ({discountPercent}%):</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax / GST ({taxRate}%):</span>
                <span>+₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Final Checkout Button */}
            <button
              type="button"
              disabled={cartItems.length === 0 || submitting}
              onClick={handleCheckout}
              className="w-full py-3 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>{submitting ? 'Deducting Stock & Finalizing...' : `Complete Sale (₹${grandTotal.toFixed(2)})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {completedTransaction && (
        <ReceiptModal
          transaction={completedTransaction}
          onClose={() => setCompletedTransaction(null)}
        />
      )}
    </div>
  );
};

export default NewSalePage;
