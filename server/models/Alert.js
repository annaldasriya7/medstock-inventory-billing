const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'Low Stock',
      'Critical Stock',
      'Out of Stock',
      'Near Expiry',
      'Expired',
      'High Expiry Risk',
      'Stock-out Risk',
      'Reorder Recommendation',
      'Unusual Consumption',
      'Overstock'
    ],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    default: null,
    index: true
  },
  medicineName: {
    type: String,
    default: ''
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    default: null
  },
  batchNumber: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  actionRecommendation: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
