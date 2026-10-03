const mongoose = require('mongoose');

const quarantineRecordSchema = new mongoose.Schema({
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
    min: 0
  },
  expiryDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: [true, 'Quarantine reason is required'],
    default: 'Passed expiration threshold'
  },
  action: {
    type: String,
    enum: ['Quarantined', 'Disposed', 'Returned to Supplier'],
    default: 'Quarantined',
    index: true
  },
  quarantinedBy: {
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
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuarantineRecord', quarantineRecordSchema);
