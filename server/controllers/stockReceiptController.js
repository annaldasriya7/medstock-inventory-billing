const StockReceipt = require('../models/StockReceipt');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Supplier = require('../models/Supplier');
const Transaction = require('../models/Transaction');
const { logStaffActivity } = require('../utils/auditLogger');

// Generate unique receipt number
const generateReceiptNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REC-${dateStr}-${rand}`;
};

// Recalculate medicine total sellable stock (excluding Expired & Quarantined)
const recalculateMedicineStock = async (medicineId, newSellingPrice) => {
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
  if (newSellingPrice && newSellingPrice > 0) {
    medicine.unitPrice = newSellingPrice;
  }
  medicine.status = totalStock > 0 ? 'Active' : 'Out of Stock';
  await medicine.save();
  return medicine;
};

// @desc    Receive incoming stock from supplier
// @route   POST /api/stock-receipts
// @access  Private (Pharmacist, Admin)
exports.receiveStock = async (req, res, next) => {
  try {
    const {
      supplierId,
      supplierName,
      invoiceNumber = '',
      medicineId,
      medicineName,
      category,
      dosageForm,
      strength,
      minStockAlert,
      batchNumber,
      quantity,
      purchasePrice,
      sellingPrice,
      manufacturingDate,
      expiryDate,
      notes = ''
    } = req.body;

    // Basic Validation
    if (!supplierName || !supplierName.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }
    if (!batchNumber || !batchNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Batch number is required.' });
    }
    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ success: false, message: 'Received quantity must be a positive number greater than 0.' });
    }
    const numPurchase = Number(purchasePrice);
    if (isNaN(numPurchase) || numPurchase < 0) {
      return res.status(400).json({ success: false, message: 'Purchase price cannot be negative.' });
    }
    const numSelling = Number(sellingPrice);
    if (isNaN(numSelling) || numSelling < 0) {
      return res.status(400).json({ success: false, message: 'Selling price cannot be negative.' });
    }
    if (!expiryDate) {
      return res.status(400).json({ success: false, message: 'Expiry date is required.' });
    }

    const expDate = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expDate <= today) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date cannot be today or in the past. Expired stock cannot be received into active inventory.'
      });
    }

    let targetMedicine = null;
    let targetBatch = null;
    const cleanBatchNo = batchNumber.trim().toUpperCase();

    // Scenario A or B: Medicine already identified
    if (medicineId) {
      targetMedicine = await Medicine.findById(medicineId);
    }

    // Fallback: check if medicine exists by exact name if no medicineId provided
    if (!targetMedicine && medicineName) {
      targetMedicine = await Medicine.findOne({ name: new RegExp(`^${medicineName.trim()}$`, 'i') });
    }

    // Scenario C: Completely new medicine registration
    if (!targetMedicine) {
      if (!medicineName || !medicineName.trim()) {
        return res.status(400).json({ success: false, message: 'Medicine name is required for new medicine registration.' });
      }

      targetMedicine = await Medicine.create({
        name: medicineName.trim(),
        genericName: medicineName.trim(),
        category: category || 'General',
        dosageForm: dosageForm || 'Tablet',
        strength: strength || '',
        unitPrice: numSelling,
        minStockAlert: Number(minStockAlert) || 10,
        totalStock: 0,
        status: 'Active'
      });

      if (req.user) {
        await logStaffActivity({
          userId: req.user._id,
          staffName: req.user.name,
          role: req.user.role,
          actionType: 'MEDICINE_CREATED',
          description: `Registered new medicine "${targetMedicine.name}" via stock receipt`,
          referenceId: targetMedicine._id.toString(),
          referenceModel: 'Medicine',
          details: { name: targetMedicine.name, unitPrice: numSelling }
        });
      }
    }

    // Check if batch already exists for this medicine (Scenario A vs B)
    targetBatch = await Batch.findOne({
      medicineId: targetMedicine._id,
      batchNumber: cleanBatchNo
    });

    if (targetBatch) {
      // Scenario A: Existing batch -> increment quantity, update cost/expiry if provided
      targetBatch.quantity += numQty;
      targetBatch.purchasePrice = numPurchase;
      targetBatch.sellingPrice = numSelling;
      targetBatch.expiryDate = expDate;
      if (manufacturingDate) targetBatch.manufacturingDate = new Date(manufacturingDate);
      if (supplierId) targetBatch.supplierId = supplierId;
      targetBatch.updateStatus();
      await targetBatch.save();
    } else {
      // Scenario B: New batch for this medicine
      targetBatch = await Batch.create({
        medicineId: targetMedicine._id,
        batchNumber: cleanBatchNo,
        quantity: numQty,
        purchasePrice: numPurchase,
        sellingPrice: numSelling,
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
        expiryDate: expDate,
        supplierId: supplierId || null,
        status: 'Active'
      });
      targetBatch.updateStatus();
      await targetBatch.save();
    }

    // Recalculate medicine total stock and unit price
    await recalculateMedicineStock(targetMedicine._id, numSelling);

    // Save supplier if it is new and supplierId is not set
    let resolvedSupplierId = supplierId || null;
    if (!resolvedSupplierId && supplierName) {
      const existingSup = await Supplier.findOne({ name: new RegExp(`^${supplierName.trim()}$`, 'i') });
      if (existingSup) {
        resolvedSupplierId = existingSup._id;
      }
    }

    const receiptNumber = generateReceiptNumber();
    const totalPurchaseValue = Number((numQty * numPurchase).toFixed(2));

    const receipt = await StockReceipt.create({
      receiptNumber,
      invoiceNumber: invoiceNumber.trim(),
      supplierId: resolvedSupplierId,
      supplierName: supplierName.trim(),
      medicineId: targetMedicine._id,
      medicineName: targetMedicine.name,
      batchNumber: cleanBatchNo,
      quantity: numQty,
      purchasePrice: numPurchase,
      sellingPrice: numSelling,
      totalPurchaseValue,
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      expiryDate: expDate,
      receivedDate: new Date(),
      receivedBy: {
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role
      },
      notes: notes.trim()
    });

    // Also record as a PURCHASE Transaction for unified transaction tracking
    await Transaction.create({
      transactionNumber: receiptNumber,
      transactionType: 'PURCHASE',
      date: new Date(),
      customerName: supplierName.trim(),
      customerPhone: '',
      items: [{
        medicineId: targetMedicine._id,
        medicineName: targetMedicine.name,
        batchId: targetBatch._id,
        batchNumber: cleanBatchNo,
        quantity: numQty,
        unitPrice: numPurchase,
        subtotal: totalPurchaseValue,
        expiryDate: expDate
      }],
      subtotal: totalPurchaseValue,
      discount: 0,
      tax: 0,
      grandTotal: totalPurchaseValue,
      paymentMethod: 'Cash',
      userId: req.user ? req.user._id : null,
      staffName: req.user ? req.user.name : 'Staff',
      staffRole: req.user ? req.user.role : 'staff',
      status: 'Completed',
      notes: `Inbound delivery receipt ${invoiceNumber ? `(Invoice #${invoiceNumber})` : ''}`
    });

    // Record in Audit Log
    if (req.user) {
      await logStaffActivity({
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role,
        actionType: 'STOCK_RECEIVED',
        description: `Received ${numQty} units of ${targetMedicine.name} (Batch: ${cleanBatchNo}) from "${supplierName.trim()}"`,
        referenceId: receipt._id.toString(),
        referenceModel: 'StockReceipt',
        details: {
          receiptNumber,
          invoiceNumber: invoiceNumber.trim(),
          supplierName: supplierName.trim(),
          medicineName: targetMedicine.name,
          batchNumber: cleanBatchNo,
          quantity: numQty,
          purchasePrice: numPurchase,
          totalPurchaseValue
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Stock received and inventory successfully updated.',
      receipt,
      batch: targetBatch,
      medicine: targetMedicine
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get stock receiving history
// @route   GET /api/stock-receipts
// @access  Private
exports.getStockReceipts = async (req, res, next) => {
  try {
    const { search, supplierName, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};
    if (supplierName) {
      query.supplierName = new RegExp(supplierName.trim(), 'i');
    }

    if (startDate || endDate) {
      query.receivedDate = {};
      if (startDate) query.receivedDate.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.receivedDate.$lte = eDate;
      }
    }

    if (search) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [
        { receiptNumber: reg },
        { invoiceNumber: reg },
        { supplierName: reg },
        { medicineName: reg },
        { batchNumber: reg },
        { 'receivedBy.staffName': reg }
      ];
    }

    const total = await StockReceipt.countDocuments(query);
    const receipts = await StockReceipt.find(query)
      .sort({ receivedDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: receipts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      receipts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single stock receipt
// @route   GET /api/stock-receipts/:id
// @access  Private
exports.getStockReceiptById = async (req, res, next) => {
  try {
    const receipt = await StockReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Stock receipt not found.' });
    }
    res.json({
      success: true,
      receipt
    });
  } catch (err) {
    next(err);
  }
};
