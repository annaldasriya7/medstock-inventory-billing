const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Supplier = require('../models/Supplier');
const SystemSettings = require('../models/SystemSettings');
const { syncInventoryAlerts } = require('../services/alertService');

// Get all medicines with inventory aggregation
exports.getMedicines = async (req, res, next) => {
  try {
    const { search, category, status, branch, page = 1, limit = 50 } = req.query;

    const query = { active: true };
    if (category && category !== 'All') query.category = category;
    if (branch) query.branch = branch;

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { genericName: searchRegex },
        { brand: searchRegex },
        { barcode: searchRegex },
        { qrCode: searchRegex },
        { category: searchRegex }
      ];
    }

    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const settings = (await SystemSettings.findOne()) || {
      lowStockThresholdUnits: 20,
      criticalStockThresholdUnits: 5
    };

    const now = new Date();

    // Attach batch and stock analytics to each medicine
    const populated = await Promise.all(
      medicines.map(async (med) => {
        const batches = await Batch.find({ medicineId: med._id }).sort({ expiryDate: 1 });
        const validBatches = batches.filter(b => b.quantity > 0 && new Date(b.expiryDate) > now);
        const totalStock = validBatches.reduce((sum, b) => sum + b.quantity, 0);

        // Find nearest expiry date
        const nearestExpiry = validBatches.length > 0 ? validBatches[0].expiryDate : null;

        // Stock status determination
        let stockStatus = 'Healthy';
        if (totalStock === 0) stockStatus = 'Out of Stock';
        else if (totalStock <= settings.criticalStockThresholdUnits) stockStatus = 'Critical';
        else if (totalStock <= (med.reorderLevel || settings.lowStockThresholdUnits)) stockStatus = 'Low';
        else if (med.maximumStock && totalStock > med.maximumStock) stockStatus = 'Overstocked';

        // Expiry status
        let expiryStatus = 'Good';
        if (nearestExpiry) {
          const daysToExpiry = Math.ceil((new Date(nearestExpiry) - now) / (1000 * 60 * 60 * 24));
          if (daysToExpiry <= 30) expiryStatus = 'Critical Near Expiry';
          else if (daysToExpiry <= 90) expiryStatus = 'Near Expiry';
        }

        const medObj = med.toObject();
        medObj.totalStock = totalStock;
        medObj.batchesCount = batches.length;
        medObj.activeBatchesCount = validBatches.length;
        medObj.stockStatus = stockStatus;
        medObj.expiryStatus = expiryStatus;
        medObj.nearestExpiry = nearestExpiry;
        medObj.sellingPrice = validBatches.length > 0 ? validBatches[0].sellingPrice : 0;
        return medObj;
      })
    );

    // Apply stock status filter if provided
    let results = populated;
    if (status && status !== 'All') {
      results = populated.filter(m => m.stockStatus.toLowerCase() === status.toLowerCase());
    }

    res.json({
      success: true,
      count: results.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      medicines: results
    });
  } catch (err) {
    next(err);
  }
};

// Scan lookup: Identify medicine by barcode, QR, or exact name
exports.scanLookup = async (req, res, next) => {
  try {
    const { code, branch } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'No barcode, QR, or text code provided for scanning.'
      });
    }

    const cleanCode = code.trim();

    // Check by barcode, qrCode, dataMatrix, or name
    const query = {
      active: true,
      $or: [
        { barcode: cleanCode },
        { qrCode: cleanCode },
        { dataMatrix: cleanCode },
        { name: new RegExp(`^${cleanCode}$`, 'i') }
      ]
    };
    if (branch) query.branch = branch;

    const medicine = await Medicine.findOne(query);

    if (!medicine) {
      return res.json({
        success: true,
        found: false,
        message: 'New Medicine Detected',
        scannedCode: cleanCode
      });
    }

    // Fetch batches for existing medicine
    const batches = await Batch.find({ medicineId: medicine._id }).sort({ expiryDate: 1 });
    const now = new Date();
    const validBatches = batches.filter(b => b.quantity > 0 && new Date(b.expiryDate) > now);
    const totalStock = validBatches.reduce((sum, b) => sum + b.quantity, 0);

    res.json({
      success: true,
      found: true,
      medicine,
      totalStock,
      batches
    });
  } catch (err) {
    next(err);
  }
};

// Create new medicine (with optional initial batch)
// Scenario C: New medicine -> create medicine + first batch
exports.createMedicine = async (req, res, next) => {
  try {
    const {
      name,
      genericName,
      brand,
      category,
      dosageForm,
      strength,
      manufacturer,
      barcode,
      qrCode,
      dataMatrix,
      description,
      unitsPerStrip,
      reorderLevel,
      maximumStock,
      supplier,
      supplierName,
      branch,
      // Optional initial batch fields
      batchNumber,
      manufacturingDate,
      expiryDate,
      initialQuantity,
      purchasePrice,
      sellingPrice
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name is required.'
      });
    }

    // Check duplicate medicine name or barcode
    const duplicateQuery = {
      $or: [{ name: new RegExp(`^${name.trim()}$`, 'i') }]
    };
    if (barcode && barcode.trim()) {
      duplicateQuery.$or.push({ barcode: barcode.trim() });
    }

    const existingMed = await Medicine.findOne(duplicateQuery);
    if (existingMed) {
      return res.status(400).json({
        success: false,
        message: `Medicine with name "${existingMed.name}" or barcode already exists in the system. Use existing medicine flow.`
      });
    }

    // Resolve supplier name if ID is provided
    let resolvedSupplierName = supplierName || '';
    if (supplier && !resolvedSupplierName) {
      const s = await Supplier.findById(supplier);
      if (s) resolvedSupplierName = s.name;
    }

    const medicine = await Medicine.create({
      name: name.trim(),
      genericName: genericName ? genericName.trim() : '',
      brand: brand ? brand.trim() : '',
      category: category || 'General',
      dosageForm: dosageForm || 'Tablet',
      strength: strength ? strength.trim() : '',
      manufacturer: manufacturer ? manufacturer.trim() : '',
      barcode: barcode ? barcode.trim() : '',
      qrCode: qrCode ? qrCode.trim() : '',
      dataMatrix: dataMatrix ? dataMatrix.trim() : '',
      description: description ? description.trim() : '',
      unitsPerStrip: unitsPerStrip || 10,
      reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : 20,
      maximumStock: maximumStock !== undefined ? Number(maximumStock) : 500,
      supplier: supplier || null,
      supplierName: resolvedSupplierName,
      branch: branch || null
    });

    // Create initial batch if batch information was supplied
    let createdBatch = null;
    if (batchNumber && expiryDate) {
      createdBatch = await Batch.create({
        batchNumber: batchNumber.trim(),
        medicineId: medicine._id,
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
        expiryDate: new Date(expiryDate),
        quantity: Number(initialQuantity) || 0,
        initialQuantity: Number(initialQuantity) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        supplierId: supplier || null,
        supplierName: resolvedSupplierName,
        receivedDate: new Date(),
        branch: branch || null
      });
      createdBatch.updateStatus();
      await createdBatch.save();
    }

    // Trigger alert recalculation
    syncInventoryAlerts(branch).catch(e => console.error('[Alert Sync Error]', e.message));

    res.status(201).json({
      success: true,
      message: 'Medicine registered successfully.',
      medicine,
      batch: createdBatch
    });
  } catch (err) {
    next(err);
  }
};

// Update medicine details
exports.updateMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    res.json({
      success: true,
      message: 'Medicine updated successfully.',
      medicine
    });
  } catch (err) {
    next(err);
  }
};

// Get single medicine with full batch list
exports.getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    const batches = await Batch.find({ medicineId: medicine._id }).sort({ expiryDate: 1 });
    const now = new Date();
    const validBatches = batches.filter(b => b.quantity > 0 && new Date(b.expiryDate) > now);
    const totalStock = validBatches.reduce((sum, b) => sum + b.quantity, 0);

    res.json({
      success: true,
      medicine,
      totalStock,
      batches
    });
  } catch (err) {
    next(err);
  }
};

// Soft delete / deactivate medicine
exports.deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    res.json({
      success: true,
      message: 'Medicine deactivated from active inventory catalog.'
    });
  } catch (err) {
    next(err);
  }
};
