const ConsumptionRecord = require('../models/ConsumptionRecord');
const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const SystemSettings = require('../models/SystemSettings');

/**
 * Standard Deviation helper
 */
const calculateStdDev = (values, mean) => {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
};

/**
 * Calculates AI demand predictions, stockout risks, and reorder recommendations for a medicine.
 */
const generateMedicinePrediction = async (medicineId, method = 'Moving Average', branchId = null) => {
  const medicine = await Medicine.findById(medicineId);
  if (!medicine) throw new Error('Medicine not found');

  const settings = (await SystemSettings.findOne()) || {
    defaultLeadTimeDays: 5,
    safetyStockDays: 7,
    taxRatePercent: 12
  };

  // Get current active stock across non-expired batches
  const batchQuery = {
    medicineId,
    status: { $ne: 'Expired' }
  };
  if (branchId) batchQuery.branch = branchId;

  const batches = await Batch.find(batchQuery).sort({ expiryDate: 1 });
  const currentStock = batches.reduce((sum, b) => sum + b.quantity, 0);

  // Get supplier lead time
  let supplierLeadTimeDays = settings.defaultLeadTimeDays;
  if (medicine.supplier) {
    const supplier = await Supplier.findById(medicine.supplier);
    if (supplier && supplier.leadTimeDays) {
      supplierLeadTimeDays = supplier.leadTimeDays;
    }
  }

  // Fetch consumption history
  const consumptionQuery = { medicineId };
  if (branchId) consumptionQuery.branchId = branchId;

  const consumptionRecords = await ConsumptionRecord.find(consumptionQuery).sort({ date: 1 });

  // If insufficient consumption data exists:
  if (consumptionRecords.length < 3) {
    return {
      medicineId: medicine._id,
      medicineName: medicine.name,
      hasSufficientData: false,
      calculatedAt: new Date(),
      historicalDaysAnalyzed: 0,
      averageDailyConsumption: 0,
      weeklyConsumption: 0,
      monthlyConsumption: 0,
      predictedDemandNext30Days: 0,
      demandTrend: 'Insufficient Data',
      confidenceScore: 'N/A',
      currentStock,
      estimatedDaysToStockout: currentStock > 0 ? 999 : 0,
      stockoutRiskLevel: currentStock === 0 ? 'Critical' : (currentStock <= medicine.reorderLevel ? 'High' : 'Low'),
      safetyStock: 0,
      supplierLeadTimeDays,
      reorderRecommendedQty: currentStock <= medicine.reorderLevel ? Math.max(0, medicine.maximumStock - currentStock) : 0,
      potentialWastageUnits: 0,
      potentialFinancialLoss: 0,
      methodUsed: method,
      explanation: 'Not enough historical data for reliable prediction. Record at least 3 distinct consumption events to generate statistical forecasting.'
    };
  }

  // Aggregate consumption by calendar day
  const dailyUsageMap = {};
  let earliestDate = new Date();
  let latestDate = new Date(0);

  for (const record of consumptionRecords) {
    const dStr = new Date(record.date).toISOString().split('T')[0];
    dailyUsageMap[dStr] = (dailyUsageMap[dStr] || 0) + record.quantity;

    const rDate = new Date(record.date);
    if (rDate < earliestDate) earliestDate = rDate;
    if (rDate > latestDate) latestDate = rDate;
  }

  const dailyValues = Object.values(dailyUsageMap);
  const distinctDaysWithSales = dailyValues.length;
  const totalQuantityConsumed = dailyValues.reduce((sum, v) => sum + v, 0);

  // Time span in days
  const timeSpanDays = Math.max(1, Math.ceil((latestDate - earliestDate) / (1000 * 60 * 60 * 24)) + 1);

  // Average daily consumption based on elapsed days span
  let avgDaily = parseFloat((totalQuantityConsumed / Math.max(distinctDaysWithSales, timeSpanDays)).toFixed(2));
  if (avgDaily <= 0) avgDaily = 0.1;

  // Forecasting algorithms
  let predictedDaily = avgDaily;

  if (method === 'Weighted Moving Average' && dailyValues.length >= 3) {
    const recent = dailyValues.slice(-5); // take up to last 5 days
    let totalWeight = 0;
    let weightedSum = 0;
    recent.forEach((val, idx) => {
      const weight = idx + 1;
      weightedSum += val * weight;
      totalWeight += weight;
    });
    predictedDaily = parseFloat((weightedSum / totalWeight).toFixed(2));
  } else if (method === 'Exponential Smoothing' && dailyValues.length >= 3) {
    const alpha = 0.4;
    let smoothed = dailyValues[0];
    for (let i = 1; i < dailyValues.length; i++) {
      smoothed = alpha * dailyValues[i] + (1 - alpha) * smoothed;
    }
    predictedDaily = parseFloat(smoothed.toFixed(2));
  } else if (method === 'Trend Regression' && dailyValues.length >= 4) {
    // Simple linear regression slope
    const n = dailyValues.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    dailyValues.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    const projectedNext = intercept + slope * n;
    predictedDaily = parseFloat(Math.max(0.1, projectedNext).toFixed(2));
  }

  // Key metrics
  const predictedDemandNext30Days = Math.round(predictedDaily * 30);
  const weeklyConsumption = Math.round(predictedDaily * 7);
  const monthlyConsumption = predictedDemandNext30Days;

  // Trend detection
  let demandTrend = 'Stable';
  if (dailyValues.length >= 4) {
    const half = Math.floor(dailyValues.length / 2);
    const firstHalfAvg = dailyValues.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalfAvg = dailyValues.slice(half).reduce((a, b) => a + b, 0) / (dailyValues.length - half);
    if (secondHalfAvg > firstHalfAvg * 1.2) demandTrend = 'Increasing';
    else if (secondHalfAvg < firstHalfAvg * 0.8) demandTrend = 'Decreasing';
  }

  // Confidence indicator
  let confidenceScore = 'Low';
  if (distinctDaysWithSales >= 14) confidenceScore = 'High';
  else if (distinctDaysWithSales >= 5) confidenceScore = 'Medium';

  // Safety stock: usage during safety stock days + buffer
  const safetyStock = Math.ceil(predictedDaily * (settings.safetyStockDays || 7));

  // Estimated days until stockout
  const estimatedDaysToStockout = predictedDaily > 0 ? parseFloat((currentStock / predictedDaily).toFixed(1)) : 999;

  // Stock-out Risk Level
  let stockoutRiskLevel = 'Low';
  if (currentStock === 0) {
    stockoutRiskLevel = 'Critical';
  } else if (estimatedDaysToStockout <= supplierLeadTimeDays) {
    stockoutRiskLevel = 'Critical';
  } else if (estimatedDaysToStockout <= supplierLeadTimeDays + (settings.safetyStockDays || 7)) {
    stockoutRiskLevel = 'High';
  } else if (estimatedDaysToStockout <= (supplierLeadTimeDays + (settings.safetyStockDays || 7)) * 1.5) {
    stockoutRiskLevel = 'Medium';
  }

  // Smart Reorder Recommendation
  // Reorder quantity = (Demand during Lead Time + Safety Stock) - Current Stock
  const demandDuringLeadTime = Math.ceil(predictedDaily * supplierLeadTimeDays);
  const requiredStockBuffer = demandDuringLeadTime + safetyStock;
  let reorderRecommendedQty = 0;

  if (currentStock < requiredStockBuffer || currentStock <= medicine.reorderLevel) {
    reorderRecommendedQty = Math.max(0, requiredStockBuffer - currentStock);
    // Respect maximum stock constraint if defined
    if (medicine.maximumStock && (currentStock + reorderRecommendedQty) > medicine.maximumStock) {
      reorderRecommendedQty = Math.max(0, medicine.maximumStock - currentStock);
    }
  }

  // Expiry Wastage Prediction
  let potentialWastageUnits = 0;
  let potentialFinancialLoss = 0;
  const now = new Date();

  for (const b of batches) {
    const daysUntilExp = Math.max(0, Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24)));
    const projectedConsumed = Math.round(predictedDaily * daysUntilExp);
    if (projectedConsumed < b.quantity) {
      const leftover = b.quantity - projectedConsumed;
      potentialWastageUnits += leftover;
      potentialFinancialLoss += leftover * (b.purchasePrice || 0);
    }
  }

  // Explainable AI text
  let explanation = '';
  if (stockoutRiskLevel === 'Critical') {
    explanation = `Critical Stock-out Risk: At average consumption of ${predictedDaily} units/day, current stock (${currentStock}) will last only ${estimatedDaysToStockout} days, which is less than or equal to supplier delivery lead time (${supplierLeadTimeDays} days). Immediate reorder recommended.`;
  } else if (stockoutRiskLevel === 'High') {
    explanation = `High Stock-out Risk: Stock of ${currentStock} units covers ${estimatedDaysToStockout} days. With a supplier lead time of ${supplierLeadTimeDays} days and recommended safety stock of ${safetyStock} units, inventory is entering the danger threshold.`;
  } else if (stockoutRiskLevel === 'Medium') {
    explanation = `Moderate Stock-out Risk: Current stock (${currentStock}) is adequate for the immediate cycle (${estimatedDaysToStockout} days remaining), but replenishment should be queued soon.`;
  } else {
    explanation = `Healthy Inventory: Available stock (${currentStock}) provides a comfortable reserve of ${estimatedDaysToStockout} days against projected demand of ${predictedDemandNext30Days} units over the next 30 days.`;
  }

  return {
    medicineId: medicine._id,
    medicineName: medicine.name,
    hasSufficientData: true,
    calculatedAt: new Date(),
    historicalDaysAnalyzed: distinctDaysWithSales,
    averageDailyConsumption: predictedDaily,
    weeklyConsumption,
    monthlyConsumption,
    predictedDemandNext30Days,
    demandTrend,
    confidenceScore,
    currentStock,
    estimatedDaysToStockout,
    stockoutRiskLevel,
    safetyStock,
    supplierLeadTimeDays,
    reorderRecommendedQty,
    potentialWastageUnits,
    potentialFinancialLoss: parseFloat(potentialFinancialLoss.toFixed(2)),
    methodUsed: method,
    explanation
  };
};

/**
 * Detects consumption anomalies across medicines (statistical spike detection).
 */
const detectConsumptionAnomalies = async (medicineId = null) => {
  const query = {};
  if (medicineId) query.medicineId = medicineId;

  // Aggregate daily records per medicine
  const records = await ConsumptionRecord.find(query).sort({ date: -1 }).limit(500);
  const medicineMap = {};

  for (const rec of records) {
    const medId = rec.medicineId.toString();
    if (!medicineMap[medId]) {
      medicineMap[medId] = {
        name: rec.medicineName,
        dailyCounts: {}
      };
    }
    const day = new Date(rec.date).toISOString().split('T')[0];
    medicineMap[medId].dailyCounts[day] = (medicineMap[medId].dailyCounts[day] || 0) + rec.quantity;
  }

  const anomalies = [];

  for (const [medId, data] of Object.entries(medicineMap)) {
    const days = Object.keys(data.dailyCounts);
    if (days.length < 3) continue;

    const values = Object.values(data.dailyCounts);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const stdDev = calculateStdDev(values, mean);

    // Check latest day
    const latestDay = days[0];
    const latestVal = data.dailyCounts[latestDay];

    if (latestVal > mean + 2.5 * stdDev && latestVal >= mean * 2.5 && latestVal > 15) {
      anomalies.push({
        medicineId: medId,
        medicineName: data.name,
        date: latestDay,
        normalAverage: parseFloat(mean.toFixed(1)),
        observedQuantity: latestVal,
        percentageIncrease: Math.round(((latestVal - mean) / mean) * 100),
        message: `Unusual consumption detected for ${data.name} on ${latestDay}: ${latestVal} units consumed vs historical baseline average of ${mean.toFixed(1)} units/day (+${Math.round(((latestVal - mean) / mean) * 100)}%).`
      });
    }
  }

  return anomalies;
};

/**
 * What-If Simulation Engine.
 * Recalculates demand, stockout days, and wastage under hypothetical scenario inputs without modifying DB.
 */
const runWhatIfSimulation = async ({
  medicineId,
  demandChangePercent = 0,
  leadTimeDelayDays = 0,
  stockChangePercent = 0,
  emergencySurgeUnits = 0,
  method = 'Moving Average'
}) => {
  const basePrediction = await generateMedicinePrediction(medicineId, method);

  const baselineDaily = basePrediction.averageDailyConsumption || 1;
  const simulatedDaily = Math.max(0.1, parseFloat((baselineDaily * (1 + demandChangePercent / 100)).toFixed(2)));

  let simulatedStock = Math.max(0, Math.round(basePrediction.currentStock * (1 + stockChangePercent / 100) - emergencySurgeUnits));
  const simulatedLeadTime = Math.max(1, basePrediction.supplierLeadTimeDays + leadTimeDelayDays);

  const simulatedDaysToStockout = simulatedDaily > 0 ? parseFloat((simulatedStock / simulatedDaily).toFixed(1)) : 999;

  let simulatedRiskLevel = 'Low';
  if (simulatedStock === 0 || simulatedDaysToStockout <= simulatedLeadTime) {
    simulatedRiskLevel = 'Critical';
  } else if (simulatedDaysToStockout <= simulatedLeadTime + basePrediction.safetyStock) {
    simulatedRiskLevel = 'High';
  } else if (simulatedDaysToStockout <= (simulatedLeadTime + basePrediction.safetyStock) * 1.5) {
    simulatedRiskLevel = 'Medium';
  }

  const simulatedDemandLeadTime = Math.ceil(simulatedDaily * simulatedLeadTime);
  const simulatedReorderQty = Math.max(0, (simulatedDemandLeadTime + basePrediction.safetyStock) - simulatedStock);

  return {
    medicineName: basePrediction.medicineName,
    baseline: {
      dailyConsumption: baselineDaily,
      currentStock: basePrediction.currentStock,
      leadTimeDays: basePrediction.supplierLeadTimeDays,
      daysToStockout: basePrediction.estimatedDaysToStockout,
      riskLevel: basePrediction.stockoutRiskLevel,
      reorderQty: basePrediction.reorderRecommendedQty
    },
    simulated: {
      dailyConsumption: simulatedDaily,
      currentStock: simulatedStock,
      leadTimeDays: simulatedLeadTime,
      daysToStockout: simulatedDaysToStockout,
      riskLevel: simulatedRiskLevel,
      reorderQty: simulatedReorderQty,
      projectedMonthlyDemand: Math.round(simulatedDaily * 30)
    },
    delta: {
      daysDifference: parseFloat((simulatedDaysToStockout - basePrediction.estimatedDaysToStockout).toFixed(1)),
      reorderDelta: simulatedReorderQty - basePrediction.reorderRecommendedQty
    }
  };
};

/**
 * Calculates Explainable Inventory Health Score (0 - 100).
 */
const calculateInventoryHealthScore = async (branchId = null) => {
  const medQuery = { active: true };
  if (branchId) medQuery.branch = branchId;

  const totalMedicines = await Medicine.countDocuments(medQuery);

  if (totalMedicines === 0) {
    return {
      score: 100,
      rating: 'Optimal (Clean State)',
      breakdown: {
        stockAvailability: { earned: 40, max: 40, note: 'No active stock-outs detected' },
        expiryRisk: { earned: 30, max: 30, note: 'Zero expired batches' },
        stockoutSafety: { earned: 20, max: 20, note: 'All items within target thresholds' },
        stability: { earned: 10, max: 10, note: 'Stable supply indicators' }
      },
      explanation: 'Database is fresh and starts empty. Health score reflects no current risks or stock deficiencies.'
    };
  }

  const batchQuery = {};
  if (branchId) batchQuery.branch = branchId;
  const batches = await Batch.find(batchQuery);

  const now = new Date();
  let expiredCount = 0;
  let nearExpiryCount = 0;
  let totalBatches = batches.length;

  for (const b of batches) {
    const daysUntilExp = Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24));
    if (daysUntilExp <= 0) expiredCount++;
    else if (daysUntilExp <= 90) nearExpiryCount++;
  }

  // Stock availability score (Max 40)
  // Check medicines with 0 stock
  const medicines = await Medicine.find(medQuery);
  let outOfStockMeds = 0;
  let lowStockMeds = 0;

  for (const m of medicines) {
    const medBatches = batches.filter(b => b.medicineId.toString() === m._id.toString() && b.quantity > 0 && new Date(b.expiryDate) > now);
    const stock = medBatches.reduce((sum, b) => sum + b.quantity, 0);
    if (stock === 0) outOfStockMeds++;
    else if (stock <= m.reorderLevel) lowStockMeds++;
  }

  const stockOutRatio = outOfStockMeds / totalMedicines;
  const stockAvailabilityPoints = Math.max(0, Math.round(40 * (1 - stockOutRatio * 1.5)));

  // Expiry risk score (Max 30)
  const expiredRatio = totalBatches > 0 ? expiredCount / totalBatches : 0;
  const nearExpiryRatio = totalBatches > 0 ? nearExpiryCount / totalBatches : 0;
  const expiryPoints = Math.max(0, Math.round(30 * (1 - expiredRatio * 2 - nearExpiryRatio * 0.5)));

  // Low Stock Safety (Max 20)
  const lowStockRatio = lowStockMeds / totalMedicines;
  const lowStockPoints = Math.max(0, Math.round(20 * (1 - lowStockRatio)));

  // Consumption stability (Max 10)
  const stabilityPoints = 10;

  const totalScore = Math.min(100, Math.max(0, stockAvailabilityPoints + expiryPoints + lowStockPoints + stabilityPoints));

  let rating = 'Excellent';
  if (totalScore < 50) rating = 'Critical Attention Needed';
  else if (totalScore < 70) rating = 'Needs Attention';
  else if (totalScore < 85) rating = 'Good';

  return {
    score: totalScore,
    rating,
    breakdown: {
      stockAvailability: {
        earned: stockAvailabilityPoints,
        max: 40,
        note: `${outOfStockMeds} of ${totalMedicines} medicines out of stock`
      },
      expiryRisk: {
        earned: expiryPoints,
        max: 30,
        note: `${expiredCount} expired and ${nearExpiryCount} near-expiry batches`
      },
      stockoutSafety: {
        earned: lowStockPoints,
        max: 20,
        note: `${lowStockMeds} medicines currently below reorder thresholds`
      },
      stability: {
        earned: stabilityPoints,
        max: 10,
        note: 'Normal consumption pattern baseline'
      }
    },
    explanation: `Inventory score is ${totalScore}/100 (${rating}). Based on ${totalMedicines} tracked medicines and ${totalBatches} active batches.`
  };
};

module.exports = {
  generateMedicinePrediction,
  detectConsumptionAnomalies,
  runWhatIfSimulation,
  calculateInventoryHealthScore
};
