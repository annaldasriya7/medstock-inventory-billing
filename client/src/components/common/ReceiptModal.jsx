import React from 'react';
import { Printer, X, CheckCircle, ShieldCheck } from 'lucide-react';

const ReceiptModal = ({ transaction, onClose }) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header Actions (Not Printed) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span>Sale Completed Successfully</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

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
              <p><span className="text-slate-500">Invoice:</span> <span className="font-mono font-bold">{transaction.transactionNumber}</span></p>
              <p><span className="text-slate-500">Date:</span> {new Date(transaction.date || transaction.createdAt).toLocaleDateString()} {new Date(transaction.date || transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="text-right">
              <p><span className="text-slate-500">Customer:</span> <span className="font-medium">{transaction.customerName || 'Walk-in'}</span></p>
              {transaction.customerPhone && <p><span className="text-slate-500">Phone:</span> {transaction.customerPhone}</p>}
              <p><span className="text-slate-500">Payment:</span> <span className="font-semibold uppercase">{transaction.paymentMethod}</span></p>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-200 text-[10px] uppercase">
                  <th className="pb-1.5">Item & FEFO Batch</th>
                  <th className="pb-1.5 text-center">Qty</th>
                  <th className="pb-1.5 text-right">Rate</th>
                  <th className="pb-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transaction.items?.map((item, idx) => (
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
              <span>₹{transaction.subtotal?.toFixed(2)}</span>
            </div>
            {transaction.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount Applied:</span>
                <span>-₹{transaction.discount?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST / Tax:</span>
              <span>+₹{transaction.tax?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Net Grand Total:</span>
              <span>₹{transaction.grandTotal?.toFixed(2)}</span>
            </div>
          </div>

          {/* Compliance & Verification Footer */}
          <div className="pt-4 text-center text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center justify-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dispensed via First-Expire, First-Out (FEFO) Protocol</span>
            </div>
            <p>Medicines once sold cannot be returned without medical receipt.</p>
            <p>Thank you for choosing MedStock AI!</p>
          </div>
        </div>

        {/* Modal Bottom Actions (Not Printed) */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
