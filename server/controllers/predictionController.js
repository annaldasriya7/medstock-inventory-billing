const Medicine = require('../models/Medicine');
const {
  generateMedicinePrediction,
  detectConsumptionAnomalies,
  runWhatIfSimulation,
  calculateInventoryHealthScore
} = require('../services/aiForecastingService');

// Get predictions for all active medicines
exports.getAllPredictions = async (req, res, next) => {
  try {
    const { method = 'Moving Average', branchId } = req.query;
    const medicines = await Medicine.find({ active: true }).sort({ name: 1 });

    const predictions = await Promise.all(
      medicines.map(med => generateMedicinePrediction(med._id, method, branchId))
    );

    res.json({
      success: true,
      count: predictions.length,
      methodUsed: method,
      predictions
    });
  } catch (err) {
    next(err);
  }
};

// Get single medicine AI prediction
exports.getSinglePrediction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { method = 'Moving Average', branchId } = req.query;

    const prediction = await generateMedicinePrediction(id, method, branchId);
    res.json({
      success: true,
      prediction
    });
  } catch (err) {
    next(err);
  }
};

// Run What-If Simulation
exports.simulateScenario = async (req, res, next) => {
  try {
    const {
      medicineId,
      demandChangePercent = 0,
      leadTimeDelayDays = 0,
      stockChangePercent = 0,
      emergencySurgeUnits = 0,
      method = 'Moving Average'
    } = req.body;

    if (!medicineId) {
      return res.status(400).json({ success: false, message: 'Medicine ID is required for simulation.' });
    }

    const simulation = await runWhatIfSimulation({
      medicineId,
      demandChangePercent: Number(demandChangePercent),
      leadTimeDelayDays: Number(leadTimeDelayDays),
      stockChangePercent: Number(stockChangePercent),
      emergencySurgeUnits: Number(emergencySurgeUnits),
      method
    });

    res.json({
      success: true,
      simulation
    });
  } catch (err) {
    next(err);
  }
};

// Get Inventory Health Score
exports.getHealthScore = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const health = await calculateInventoryHealthScore(branchId);
    res.json({
      success: true,
      health
    });
  } catch (err) {
    next(err);
  }
};

// Get detected consumption anomalies
exports.getAnomalies = async (req, res, next) => {
  try {
    const anomalies = await detectConsumptionAnomalies();
    res.json({
      success: true,
      count: anomalies.length,
      anomalies
    });
  } catch (err) {
    next(err);
  }
};
