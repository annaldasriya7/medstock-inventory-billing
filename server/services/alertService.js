const Alert = require('../models/Alert');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const SystemSettings = require('../models/SystemSettings');
const { detectConsumptionAnomalies, generateMedicinePrediction } = require('./aiForecastingService');

/**
 * Scans active inventory, batches, and anomalies to generate system alerts.
 */
const syncInventoryAlerts = async (branchId = null) => {
  const settings = (await SystemSettings.findOne()) || {
    lowStockThresholdUnits: 20,
    criticalStockThresholdUnits: 5,
    nearExpiryThresholdDays: 90,
    criticalExpiryThresholdDays: 30
  };

  const now = new Date();
  const medQuery = { active: true };
  if (branchId) medQuery.branch = branchId;
  const medicines = await Medicine.find(medQuery);

  const batchQuery = {};
  if (branchId) batchQuery.branch = branchId;
  const batches = await Batch.find(batchQuery);

  for (const med of medicines) {
    const medBatches = batches.filter(b => b.medicineId.toString() === med._id.toString());
    const validBatches = medBatches.filter(b => new Date(b.expiryDate) > now);
    const totalValidStock = validBatches.reduce((sum, b) => sum + b.quantity, 0);

    // 1. Stock Out Alert
    if (totalValidStock === 0) {
      await Alert.findOneAndUpdate(
        { medicineId: med._id, type: 'Out of Stock' },
        {
          type: 'Out of Stock',
          severity: 'critical',
          medicineId: med._id,
          medicineName: med.name,
          message: `${med.name} is completely OUT OF STOCK. Immediate procurement required.`,
          actionRecommendation: `Contact supplier ${med.supplierName || 'vendor'} immediately to place an expedited order.`,
          date: new Date()
        },
        { upsert: true, new: true }
      );
    } else {
      await Alert.deleteMany({ medicineId: med._id, type: 'Out of Stock' });
    }

    // 2. Critical Stock Alert
    if (totalValidStock > 0 && totalValidStock <= settings.criticalStockThresholdUnits) {
      await Alert.findOneAndUpdate(
        { medicineId: med._id, type: 'Critical Stock' },
        {
          type: 'Critical Stock',
          severity: 'critical',
          medicineId: med._id,
          medicineName: med.name,
          message: `${med.name} stock is critically low (${totalValidStock} units remaining). Threshold: ${settings.criticalStockThresholdUnits} units.`,
          actionRecommendation: 'Review pending orders and restock before stockout occurs.',
          date: new Date()
        },
        { upsert: true, new: true }
      );
    } else {
      await Alert.deleteMany({ medicineId: med._id, type: 'Critical Stock' });
    }

    // 3. Low Stock Alert
    const lowThreshold = med.reorderLevel || settings.lowStockThresholdUnits;
    if (totalValidStock > settings.criticalStockThresholdUnits && totalValidStock <= lowThreshold) {
      await Alert.findOneAndUpdate(
        { medicineId: med._id, type: 'Low Stock' },
        {
          type: 'Low Stock',
          severity: 'high',
          medicineId: med._id,
          medicineName: med.name,
          message: `${med.name} has fallen below its reorder level (${totalValidStock} units remaining, threshold is ${lowThreshold}).`,
          actionRecommendation: 'Generate a purchase order for restocking.',
          date: new Date()
        },
        { upsert: true, new: true }
      );
    } else {
      await Alert.deleteMany({ medicineId: med._id, type: 'Low Stock' });
    }

    // 4. Overstock Alert
    if (med.maximumStock && totalValidStock > med.maximumStock) {
      await Alert.findOneAndUpdate(
        { medicineId: med._id, type: 'Overstock' },
        {
          type: 'Overstock',
          severity: 'low',
          medicineId: med._id,
          medicineName: med.name,
          message: `${med.name} stock (${totalValidStock} units) exceeds configured maximum storage capacity (${med.maximumStock} units).`,
          actionRecommendation: 'Pause purchase orders and prioritize sales to prevent tie-up of working capital.',
          date: new Date()
        },
        { upsert: true, new: true }
      );
    } else {
      await Alert.deleteMany({ medicineId: med._id, type: 'Overstock' });
    }

    // 5. Batch Expiry Alerts
    for (const b of medBatches) {
      if (b.quantity <= 0) continue;
      const daysUntilExp = Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExp <= 0) {
        await Alert.findOneAndUpdate(
          { batchId: b._id, type: 'Expired' },
          {
            type: 'Expired',
            severity: 'critical',
            medicineId: med._id,
            medicineName: med.name,
            batchId: b._id,
            batchNumber: b.batchNumber,
            message: `Batch ${b.batchNumber} of ${med.name} expired on ${new Date(b.expiryDate).toLocaleDateString()} (${b.quantity} units).`,
            actionRecommendation: 'Quarantine and dispose of expired batch immediately according to biomedical pharmacy guidelines.',
            date: new Date()
          },
          { upsert: true, new: true }
        );
      } else if (daysUntilExp <= settings.criticalExpiryThresholdDays) {
        await Alert.findOneAndUpdate(
          { batchId: b._id, type: 'Near Expiry' },
          {
            type: 'Near Expiry',
            severity: 'high',
            medicineId: med._id,
            medicineName: med.name,
            batchId: b._id,
            batchNumber: b.batchNumber,
            message: `Batch ${b.batchNumber} of ${med.name} expires in ${daysUntilExp} days (${b.quantity} units).`,
            actionRecommendation: 'Prioritize dispensing via FEFO or request supplier return/exchange.',
            date: new Date()
          },
          { upsert: true, new: true }
        );
      }
    }
  }

  // 6. Check Consumption Anomalies
  try {
    const anomalies = await detectConsumptionAnomalies();
    for (const anom of anomalies) {
      await Alert.findOneAndUpdate(
        { medicineId: anom.medicineId, type: 'Unusual Consumption' },
        {
          type: 'Unusual Consumption',
          severity: 'medium',
          medicineId: anom.medicineId,
          medicineName: anom.medicineName,
          message: anom.message,
          actionRecommendation: 'Investigate recent transaction log to verify bulk orders, seasonal outbreaks, or transcription anomalies.',
          date: new Date()
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.warn('[AlertService] Anomaly check skipped:', err.message);
  }

  return await Alert.find({ isRead: false }).sort({ date: -1 }).limit(50);
};

module.exports = {
  syncInventoryAlerts
};
