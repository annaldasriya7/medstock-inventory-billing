const StockAdjustment = require('../models/StockAdjustment');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const { logStaffActivity } = require('../utils/auditLogger');

// Generate unique adjustment reference number
const generateAdjustmentNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ADJ-${dateStr}-${rand}`;
};

// Recalculate medicine total stock
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

// @desc    Perform physical stock adjustment / discrepancy correction
// @route   POST /api/stock-adjustments
// @access  Private (Admin, Pharmacist)
exports.adjustStock = async (req, res, next) => {
  try {
    const {
      medicineId,
      batchId,
      physicalQuantity,
      reason,
      notes = ''
    } = req.body;

    if (!medicineId || !batchId) {
      return res.status(400).json({ success: false, message: 'Medicine ID and Batch ID are required.' });
    }

    const numPhysical = Number(physicalQuantity);
    if (isNaN(numPhysical) || numPhysical < 0) {
      return res.status(400).json({ success: false, message: 'Physical quantity must be a non-negative number.' });
    }

    const validReasons = ['Damaged', 'Expired', 'Missing', 'Manual counting error', 'Return', 'Other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Reason is required and must be one of: ${validReasons.join(', ')}`
      });
    }

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    const batch = await Batch.findOne({ _id: batchId, medicineId });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found for this medicine.' });
    }

    const previousQuantity = batch.quantity;
    const difference = numPhysical - previousQuantity;

    // Apply adjustment atomically
    batch.quantity = numPhysical;
    batch.updateStatus();
    await batch.save();

    // Recalculate medicine's sellable total stock
    await recalculateMedicineStock(medicineId);

    const adjustmentNumber = generateAdjustmentNumber();

    const adjustment = await StockAdjustment.create({
      adjustmentNumber,
      medicineId: medicine._id,
      medicineName: medicine.name,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      previousQuantity,
      physicalQuantity: numPhysical,
      difference,
      reason,
      notes: notes.trim(),
      adjustedBy: {
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role
      },
      date: new Date()
    });

    // Record in Audit Log
    if (req.user) {
      const diffSign = difference >= 0 ? `+${difference}` : `${difference}`;
      await logStaffActivity({
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role,
        actionType: 'STOCK_ADJUSTED',
        description: `Adjusted stock for ${medicine.name} (Batch: ${batch.batchNumber}) from ${previousQuantity} to ${numPhysical} (${diffSign} units). Reason: ${reason}`,
        referenceId: adjustment._id.toString(),
        referenceModel: 'StockAdjustment',
        details: {
          adjustmentNumber,
          medicineName: medicine.name,
          batchNumber: batch.batchNumber,
          previousQuantity,
          physicalQuantity: numPhysical,
          difference,
          reason,
          notes: notes.trim()
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Stock adjustment successfully applied and logged.',
      adjustment,
      updatedBatch: batch,
      medicineTotalStock: medicine.totalStock
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get stock adjustments history
// @route   GET /api/stock-adjustments
// @access  Private
exports.getStockAdjustments = async (req, res, next) => {
  try {
    const { search, reason, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};
    if (reason && reason !== 'All') {
      query.reason = reason;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.date.$lte = eDate;
      }
    }

    if (search) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [
        { adjustmentNumber: reg },
        { medicineName: reg },
        { batchNumber: reg },
        { 'adjustedBy.staffName': reg },
        { notes: reg }
      ];
    }

    const total = await StockAdjustment.countDocuments(query);
    const adjustments = await StockAdjustment.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: adjustments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      adjustments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single stock adjustment
// @route   GET /api/stock-adjustments/:id
// @access  Private
exports.getStockAdjustmentById = async (req, res, next) => {
  try {
    const adjustment = await StockAdjustment.findById(req.params.id);
    if (!adjustment) {
      return res.status(404).json({ success: false, message: 'Stock adjustment record not found.' });
    }
    res.json({
      success: true,
      adjustment
    });
  } catch (err) {
    next(err);
  }
};
