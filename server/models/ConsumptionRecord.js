const mongoose = require('mongoose');

const consumptionRecordSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity consumed must be at least 1']
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
    index: true
  },
  transactionNumber: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  }
}, {
  timestamps: true
});

// Index for rapid aggregation of daily/weekly/monthly medicine consumption
consumptionRecordSchema.index({ medicineId: 1, date: -1 });

module.exports = mongoose.model('ConsumptionRecord', consumptionRecordSchema);
