const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const { syncInventoryAlerts } = require('../services/alertService');

// Get all batches with FEFO sorting
exports.getBatches = async (req, res, next) => {
  try {
    const { medicineId, status, search, branch, page = 1, limit = 50 } = req.query;

    const query = {};
    if (medicineId) query.medicineId = medicineId;
    if (status && status !== 'All') query.status = status;
    if (branch) query.branch = branch;

    if (search) {
      query.batchNumber = new RegExp(search.trim(), 'i');
    }

    const total = await Batch.countDocuments(query);
    // FEFO order: earliest expiry date first
    const batches = await Batch.find(query)
      .populate('medicineId', 'name genericName brand category dosageForm unitsPerStrip')
      .sort({ expiryDate: 1, createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const now = new Date();
    const enriched = batches.map(b => {
      const obj = b.toObject();
      const daysUntilExpiry = Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24));
      obj.daysUntilExpiry = daysUntilExpiry;
      return obj;
    });

    res.json({
      success: true,
      count: enriched.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      batches: enriched
    });
  } catch (err) {
    next(err);
  }
};

// Add or update batch
// Scenario A: Same medicine + same batch -> update quantity
// Scenario B: Same medicine + new batch -> create new batch
exports.createOrUpdateBatch = async (req, res, next) => {
  try {
    const {
      medicineId,
      batchNumber,
      manufacturingDate,
      expiryDate,
      quantity,
      purchasePrice,
      sellingPrice,
      supplierId,
      supplierName,
      branch
    } = req.body;

    if (!medicineId || !batchNumber || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Medicine, batch number, and expiry date are required.'
      });
    }

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Referenced medicine not found.' });
    }

    // Resolve supplier name if ID provided
    let resolvedSupplierName = supplierName || '';
    if (supplierId && !resolvedSupplierName) {
      const s = await Supplier.findById(supplierId);
      if (s) resolvedSupplierName = s.name;
    }

    const cleanBatchNum = batchNumber.trim().toUpperCase();

    // Check if batch already exists for this medicine (Scenario A)
    let batch = await Batch.findOne({ medicineId, batchNumber: cleanBatchNum });

    if (batch) {
      // Scenario A: Same medicine + same batch -> increment quantity
      const addedQty = Number(quantity) || 0;
      batch.quantity += addedQty;
      batch.initialQuantity += addedQty;
      if (purchasePrice !== undefined) batch.purchasePrice = Number(purchasePrice);
      if (sellingPrice !== undefined) batch.sellingPrice = Number(sellingPrice);
      if (manufacturingDate) batch.manufacturingDate = new Date(manufacturingDate);
      if (expiryDate) batch.expiryDate = new Date(expiryDate);
      if (supplierId) batch.supplierId = supplierId;
      if (resolvedSupplierName) batch.supplierName = resolvedSupplierName;

      batch.updateStatus();
      await batch.save();

      syncInventoryAlerts(branch).catch(e => console.error('[Alert Sync]', e.message));

      return res.json({
        success: true,
        scenario: 'A_EXISTING_BATCH_UPDATED',
        message: `Updated existing batch ${cleanBatchNum}. Added ${addedQty} units (Total: ${batch.quantity}).`,
        batch
      });
    }

    // Scenario B: Same medicine + new batch
    batch = await Batch.create({
      medicineId,
      batchNumber: cleanBatchNum,
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      expiryDate: new Date(expiryDate),
      quantity: Number(quantity) || 0,
      initialQuantity: Number(quantity) || 0,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      supplierId: supplierId || null,
      supplierName: resolvedSupplierName,
      receivedDate: new Date(),
      branch: branch || null
    });

    batch.updateStatus();
    await batch.save();

    syncInventoryAlerts(branch).catch(e => console.error('[Alert Sync]', e.message));

    res.status(201).json({
      success: true,
      scenario: 'B_NEW_BATCH_CREATED',
      message: `Created new batch ${cleanBatchNum} under ${medicine.name}.`,
      batch
    });
  } catch (err) {
    next(err);
  }
};

// Update batch details
exports.updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    Object.assign(batch, req.body);
    batch.updateStatus();
    await batch.save();

    syncInventoryAlerts().catch(e => console.error('[Alert Sync]', e.message));

    res.json({
      success: true,
      message: 'Batch updated successfully.',
      batch
    });
  } catch (err) {
    next(err);
  }
};

// Delete batch
exports.deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    syncInventoryAlerts().catch(e => console.error('[Alert Sync]', e.message));

    res.json({
      success: true,
      message: 'Batch deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};
