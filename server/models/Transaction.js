const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  medicineName: {
    type: String,
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  batchNumber: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  expiryDate: {
    type: Date
  }
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  transactionNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  customerName: {
    type: String,
    default: 'Walk-in Customer',
    trim: true
  },
  customerPhone: {
    type: String,
    default: '',
    trim: true
  },
  items: [transactionItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  grandTotal: {
    type: Number,
    required: true,
    min: [0, 'Grand total cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Card'],
    default: 'Cash'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  staffName: {
    type: String,
    default: 'Staff'
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  status: {
    type: String,
    enum: ['Completed', 'Cancelled', 'Refunded'],
    default: 'Completed'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
