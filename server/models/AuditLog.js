const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  staffName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  actionType: {
    type: String,
    required: true,
    enum: [
      'SALE_CREATED',
      'STOCK_RECEIVED',
      'STOCK_ADJUSTED',
      'MEDICINE_CREATED',
      'MEDICINE_UPDATED',
      'MEDICINE_DEACTIVATED',
      'BATCH_CREATED',
      'BATCH_UPDATED',
      'MEDICINE_QUARANTINED',
      'QUARANTINE_ACTION',
      'STAFF_CREATED',
      'STAFF_UPDATED',
      'BILL_REPRINTED',
      'MEDICINE_RETURNED'
    ],
    index: true
  },
  description: {
    type: String,
    required: true
  },
  referenceId: {
    type: String,
    default: ''
  },
  referenceModel: {
    type: String,
    default: ''
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
