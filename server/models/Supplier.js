const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
    unique: true
  },
  contactPerson: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  leadTimeDays: {
    type: Number,
    default: 5,
    min: [1, 'Lead time must be at least 1 day']
  },
  medicinesSupplied: [{
    type: String,
    trim: true
  }],
  orderHistory: [{
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date },
    delayedDays: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'Delivered', 'Cancelled'], default: 'Delivered' },
    notes: String
  }],
  averageDeliveryDays: {
    type: Number,
    default: 5
  },
  reliabilityRating: {
    type: Number,
    min: 1,
    max: 5,
    default: 4.5
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Supplier', supplierSchema);
