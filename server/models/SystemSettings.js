const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  pharmacyName: {
    type: String,
    default: 'MedStock AI Pharmacy'
  },
  tagline: {
    type: String,
    default: 'Smart Healthcare & Intelligent Inventory'
  },
  address: {
    type: String,
    default: '101 Healthcare Blvd, Medical District'
  },
  phone: {
    type: String,
    default: '+91 98765 43210'
  },
  email: {
    type: String,
    default: 'contact@medstockai.com'
  },
  gstNumber: {
    type: String,
    default: 'GSTIN29ABCDE1234F1Z5'
  },
  currencySymbol: {
    type: String,
    default: '₹'
  },
  taxRatePercent: {
    type: Number,
    default: 12, // Standard pharmaceutical GST in India (12%)
    min: 0,
    max: 100
  },
  lowStockThresholdUnits: {
    type: Number,
    default: 20,
    min: 1
  },
  criticalStockThresholdUnits: {
    type: Number,
    default: 5,
    min: 0
  },
  nearExpiryThresholdDays: {
    type: Number,
    default: 90, // 3 months
    min: 1
  },
  criticalExpiryThresholdDays: {
    type: Number,
    default: 30, // 1 month
    min: 1
  },
  defaultLeadTimeDays: {
    type: Number,
    default: 5,
    min: 1
  },
  safetyStockDays: {
    type: Number,
    default: 7,
    min: 1
  },
  autoAlertsEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
