const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    trim: true,
    default: '',
    index: true
  },
  brand: {
    type: String,
    trim: true,
    default: '',
    index: true
  },
  category: {
    type: String,
    trim: true,
    default: 'General',
    index: true
  },
  dosageForm: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Powder', 'Suppository', 'Other'],
    default: 'Tablet'
  },
  strength: {
    type: String,
    trim: true,
    default: ''
  },
  manufacturer: {
    type: String,
    trim: true,
    default: ''
  },
  barcode: {
    type: String,
    trim: true,
    default: '',
    sparse: true,
    index: true
  },
  qrCode: {
    type: String,
    trim: true,
    default: '',
    sparse: true,
    index: true
  },
  dataMatrix: {
    type: String,
    trim: true,
    default: '',
    sparse: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  unitsPerStrip: {
    type: Number,
    default: 10,
    min: [1, 'Units per strip must be at least 1']
  },
  reorderLevel: {
    type: Number,
    default: 20,
    min: [0, 'Reorder level cannot be negative']
  },
  maximumStock: {
    type: Number,
    default: 500,
    min: [1, 'Maximum stock must be at least 1']
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  supplierName: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate for batches
medicineSchema.virtual('batches', {
  ref: 'Batch',
  localField: '_id',
  foreignField: 'medicineId'
});

// Compound text index for global search
medicineSchema.index({
  name: 'text',
  genericName: 'text',
  brand: 'text',
  barcode: 'text',
  category: 'text'
});

module.exports = mongoose.model('Medicine', medicineSchema);
