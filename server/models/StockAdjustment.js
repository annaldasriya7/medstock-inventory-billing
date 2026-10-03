const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema({
  adjustmentNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
    index: true
  },
  medicineName: {
    type: String,
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
    index: true
  },
  batchNumber: {
    type: String,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true,
    min: [0, 'Previous quantity cannot be negative']
  },
  physicalQuantity: {
    type: Number,
    required: true,
    min: [0, 'Physical quantity cannot be negative']
  },
  difference: {
    type: Number,
    required: true // Can be positive or negative
  },
  reason: {
    type: String,
    required: [true, 'Adjustment reason is required'],
    enum: ['Damaged', 'Expired', 'Missing', 'Manual counting error', 'Return', 'Other']
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  adjustedBy: {
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
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
