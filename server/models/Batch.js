const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    trim: true,
    index: true
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: [true, 'Medicine reference is required'],
    index: true
  },
  manufacturingDate: {
    type: Date,
    default: null
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    index: true
  },
  quantity: {
    type: Number,
    required: [true, 'Batch quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  initialQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Initial quantity cannot be negative']
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative'],
    default: 0
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative'],
    default: 0
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  supplierName: {
    type: String,
    default: ''
  },
  receivedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Active', 'Near Expiry', 'Expired', 'Depleted', 'Quarantined'],
    default: 'Active',
    index: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  }
}, {
  timestamps: true
});

// Dynamic status updater helper method
batchSchema.methods.updateStatus = function () {
  const now = new Date();
  const daysUntilExpiry = Math.ceil((this.expiryDate - now) / (1000 * 60 * 60 * 24));

  if (this.status === 'Quarantined') {
    return 'Quarantined';
  }

  if (this.quantity <= 0) {
    this.status = 'Depleted';
  } else if (daysUntilExpiry <= 0) {
    this.status = 'Expired';
  } else if (daysUntilExpiry <= 90) { // Under 3 months considered near expiry
    this.status = 'Near Expiry';
  } else {
    this.status = 'Active';
  }
  return this.status;
};

// Compound index to guarantee batch uniqueness per medicine
batchSchema.index({ medicineId: 1, batchNumber: 1 }, { unique: true });

module.exports = mongoose.model('Batch', batchSchema);
