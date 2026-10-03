const mongoose = require('mongoose');

const salesReturnSchema = new mongoose.Schema({
  returnNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  originalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    index: true
  },
  originalTransactionNumber: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
    default: 'Walk-in Customer'
  },
  customerPhone: {
    type: String,
    default: ''
  },
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
  returnQuantity: {
    type: Number,
    required: true,
    min: [1, 'Return quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  refundAmount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true,
    enum: ['Customer return', 'Wrong item', 'Damaged item', 'Other'],
    default: 'Customer return'
  },
  condition: {
    type: String,
    enum: ['Resellable', 'Damaged / Unusable'],
    default: 'Resellable'
  },
  isResellable: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    default: ''
  },
  returnedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    staffName: {
      type: String,
      default: 'Staff'
    },
    role: {
      type: String,
      default: 'staff'
    }
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SalesReturn', salesReturnSchema);
