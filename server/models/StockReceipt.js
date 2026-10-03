const mongoose = require('mongoose');

const stockReceiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  invoiceNumber: {
    type: String,
    trim: true,
    default: ''
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  supplierName: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: [true, 'Medicine reference is required'],
    index: true
  },
  medicineName: {
    type: String,
    required: true
  },
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Received quantity is required'],
    min: [1, 'Received quantity must be at least 1']
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },
  totalPurchaseValue: {
    type: Number,
    required: true,
    min: [0, 'Total purchase value cannot be negative']
  },
  manufacturingDate: {
    type: Date,
    default: null
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  receivedDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  receivedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    staffName: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    }
  },
  notes: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StockReceipt', stockReceiptSchema);
