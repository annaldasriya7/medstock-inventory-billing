const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');
const QuarantineRecord = require('../models/QuarantineRecord');
const { logStaffActivity } = require('../utils/auditLogger');

// Recalculate medicine total sellable stock (excluding Expired & Quarantined)
const recalculateMedicineStock = async (medicineId) => {
  const medicine = await Medicine.findById(medicineId);
  if (!medicine) return null;

  const now = new Date();
  const validBatches = await Batch.find({
    medicineId,
    status: { $nin: ['Expired', 'Quarantined'] },
    expiryDate: { $gt: now }
  });

  const totalStock = validBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);
  medicine.totalStock = totalStock;
  medicine.status = totalStock > 0 ? 'Active' : 'Out of Stock';
  await medicine.save();
  return medicine;
};

// @desc    Get all expired and quarantined batches + summary metrics
// @route   GET /api/quarantine
// @access  Private
exports.getQuarantineOverview = async (req, res, next) => {
  try {
    const now = new Date();

    // 1. Auto-flag any batch where expiryDate <= now that isn't Quarantined yet
    await Batch.updateMany(
      {
        expiryDate: { $lte: now },
        status: { $ne: 'Quarantined' }
      },
      {
        $set: { status: 'Expired' }
      }
    );

    // Fetch Expired batches (with medicine details populated)
    const expiredBatches = await Batch.find({
      status: 'Expired',
      quantity: { $gt: 0 }
    }).populate('medicineId', 'name genericName category dosageForm strength unitPrice')
      .populate('supplierId', 'name contactPhone')
      .sort({ expiryDate: 1 });

    // Fetch Quarantined batches
    const quarantinedBatches = await Batch.find({
      status: 'Quarantined',
      quantity: { $gt: 0 }
    }).populate('medicineId', 'name genericName category dosageForm strength unitPrice')
      .populate('supplierId', 'name contactPhone')
      .sort({ updatedAt: -1 });

    // Summary calculations
    const totalExpiredBatches = expiredBatches.length;
    const totalQuarantinedBatches = quarantinedBatches.length;

    const totalExpiredUnits = expiredBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
    const totalQuarantinedUnits = quarantinedBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);

    const financialLossExpired = expiredBatches.reduce((sum, b) => sum + ((b.quantity || 0) * (b.purchasePrice || b.sellingPrice || 0)), 0);
    const financialLossQuarantined = quarantinedBatches.reduce((sum, b) => sum + ((b.quantity || 0) * (b.purchasePrice || b.sellingPrice || 0)), 0);

    res.json({
      success: true,
      summary: {
        totalExpiredBatches,
        totalQuarantinedBatches,
        totalExpiredUnits,
        totalQuarantinedUnits,
        financialLossExpired: Number(financialLossExpired.toFixed(2)),
        financialLossQuarantined: Number(financialLossQuarantined.toFixed(2)),
        totalFinancialRisk: Number((financialLossExpired + financialLossQuarantined).toFixed(2))
      },
      expiredBatches,
      quarantinedBatches
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Move expired or flagged batch into Quarantine
// @route   POST /api/quarantine/move
// @access  Private (Admin, Pharmacist)
exports.moveToQuarantine = async (req, res, next) => {
  try {
    const { batchId, reason = 'Passed expiration threshold', notes = '' } = req.body;

    if (!batchId) {
      return res.status(400).json({ success: false, message: 'Batch ID is required.' });
    }

    const batch = await Batch.findById(batchId).populate('medicineId');
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const medicine = batch.medicineId;
    const previousStatus = batch.status;

    // Set batch status to Quarantined
    batch.status = 'Quarantined';
    await batch.save();

    // Ensure medicine total stock is strictly recalculated without this quarantined batch
    if (medicine) {
      await recalculateMedicineStock(medicine._id);
    }

    // Create Quarantine record
    const quarantineRecord = await QuarantineRecord.create({
      medicineId: medicine ? medicine._id : batch.medicineId,
      medicineName: medicine ? medicine.name : 'Unknown Medicine',
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate,
      reason: reason || 'Expired medicine isolated into quarantine',
      action: 'Quarantined',
      quarantinedBy: {
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role
      },
      notes: notes.trim(),
      date: new Date()
    });

    // Record in Audit Log
    if (req.user) {
      await logStaffActivity({
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role,
        actionType: 'MEDICINE_QUARANTINED',
        description: `Moved ${batch.quantity} units of ${medicine ? medicine.name : 'Medicine'} (Batch: ${batch.batchNumber}) to Quarantine`,
        referenceId: batch._id.toString(),
        referenceModel: 'Batch',
        details: {
          batchNumber: batch.batchNumber,
          quantity: batch.quantity,
          expiryDate: batch.expiryDate,
          previousStatus,
          reason
        }
      });
    }

    res.json({
      success: true,
      message: `Batch ${batch.batchNumber} has been isolated into Quarantine. It is blocked from POS sales and FEFO dispensing.`,
      batch,
      quarantineRecord
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Perform disposal or supplier return on quarantined batch
// @route   POST /api/quarantine/action
// @access  Private (Admin, Pharmacist)
exports.performQuarantineAction = async (req, res, next) => {
  try {
    const { batchId, action, reason, notes = '' } = req.body;

    if (!batchId) {
      return res.status(400).json({ success: false, message: 'Batch ID is required.' });
    }

    const validActions = ['Disposed', 'Returned to Supplier'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Action is required and must be either 'Disposed' or 'Returned to Supplier'.`
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason for disposal or return is required.' });
    }

    const batch = await Batch.findById(batchId).populate('medicineId');
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const medicine = batch.medicineId;
    const removedQty = batch.quantity;

    // Zero out quantity and deplete batch
    batch.quantity = 0;
    batch.status = 'Depleted';
    await batch.save();

    // Recalculate medicine total stock
    if (medicine) {
      await recalculateMedicineStock(medicine._id);
    }

    // Create Quarantine record
    const quarantineRecord = await QuarantineRecord.create({
      medicineId: medicine ? medicine._id : batch.medicineId,
      medicineName: medicine ? medicine.name : 'Unknown Medicine',
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      quantity: removedQty,
      expiryDate: batch.expiryDate,
      reason: reason.trim(),
      action,
      quarantinedBy: {
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role
      },
      notes: notes.trim(),
      date: new Date()
    });

    // Record in Audit Log
    if (req.user) {
      await logStaffActivity({
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role,
        actionType: 'QUARANTINE_ACTION',
        description: `${action} ${removedQty} units of ${medicine ? medicine.name : 'Medicine'} (Batch: ${batch.batchNumber}). Reason: ${reason.trim()}`,
        referenceId: batch._id.toString(),
        referenceModel: 'Batch',
        details: {
          action,
          batchNumber: batch.batchNumber,
          quantity: removedQty,
          reason: reason.trim(),
          notes: notes.trim()
        }
      });
    }

    res.json({
      success: true,
      message: `Batch ${batch.batchNumber} (${removedQty} units) successfully marked as ${action}.`,
      batch,
      quarantineRecord
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get quarantine actions log / history
// @route   GET /api/quarantine/records
// @access  Private
exports.getQuarantineRecords = async (req, res, next) => {
  try {
    const { action, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (action && action !== 'All') {
      query.action = action;
    }

    if (search) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [
        { medicineName: reg },
        { batchNumber: reg },
        { reason: reg },
        { 'quarantinedBy.staffName': reg }
      ];
    }

    const total = await QuarantineRecord.countDocuments(query);
    const records = await QuarantineRecord.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: records.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      records
    });
  } catch (err) {
    next(err);
  }
};
