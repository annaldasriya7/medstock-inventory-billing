const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
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
  calculatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  historicalDaysAnalyzed: {
    type: Number,
    default: 0
  },
  hasSufficientData: {
    type: Boolean,
    default: false
  },
  averageDailyConsumption: {
    type: Number,
    default: 0
  },
  weeklyConsumption: {
    type: Number,
    default: 0
  },
  monthlyConsumption: {
    type: Number,
    default: 0
  },
  predictedDemandNext30Days: {
    type: Number,
    default: 0
  },
  demandTrend: {
    type: String,
    enum: ['Increasing', 'Decreasing', 'Stable', 'Insufficient Data'],
    default: 'Insufficient Data'
  },
  confidenceScore: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'N/A'],
    default: 'N/A'
  },
  currentStock: {
    type: Number,
    default: 0
  },
  estimatedDaysToStockout: {
    type: Number,
    default: 999
  },
  stockoutRiskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Low'
  },
  safetyStock: {
    type: Number,
    default: 0
  },
  supplierLeadTimeDays: {
    type: Number,
    default: 5
  },
  reorderRecommendedQty: {
    type: Number,
    default: 0
  },
  potentialWastageUnits: {
    type: Number,
    default: 0
  },
  potentialFinancialLoss: {
    type: Number,
    default: 0
  },
  explanation: {
    type: String,
    default: ''
  },
  methodUsed: {
    type: String,
    enum: ['Moving Average', 'Weighted Moving Average', 'Exponential Smoothing', 'Trend Regression'],
    default: 'Moving Average'
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Prediction', predictionSchema);
