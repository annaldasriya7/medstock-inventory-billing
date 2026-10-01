const Transaction = require('../models/Transaction');
const ConsumptionRecord = require('../models/ConsumptionRecord');
const Medicine = require('../models/Medicine');
const SystemSettings = require('../models/SystemSettings');
const { previewFefoAllocation, executeFefoDeduction } = require('../services/fefoService');
const { syncInventoryAlerts } = require('../services/alertService');

// Generate unique sequential invoice number
const generateInvoiceNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = await Transaction.countDocuments({
    date: {
      $gte: new Date(today.setHours(0, 0, 0, 0)),
      $lte: new Date(today.setHours(23, 59, 59, 999))
    }
  });
  const seq = String(countToday + 1).padStart(4, '0');
  return `MED-${dateStr}-${seq}`;
};

// Preview FEFO batch breakdown for items in the cart
exports.previewCartFefo = async (req, res, next) => {
  try {
    const { items, branchId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty. No items to preview.' });
    }

    const previewResults = [];

    for (const item of items) {
      const { medicineId, quantity } = item;
      const medicine = await Medicine.findById(medicineId).select('name genericName brand');
      if (!medicine) {
        return res.status(404).json({ success: false, message: `Medicine not found for ID: ${medicineId}` });
      }

      const allocations = await previewFefoAllocation(medicineId, Number(quantity), branchId);
      previewResults.push({
        medicineId,
        medicineName: medicine.name,
        requestedQuantity: Number(quantity),
        allocations
      });
    }

    res.json({
      success: true,
      preview: previewResults
    });
  } catch (err) {
    next(err);
  }
};

// Process POS Checkout & Sale (Automatic Stock Deduction + FEFO + Consumption Logging)
exports.createSale = async (req, res, next) => {
  try {
    const {
      items,
      customerName,
      customerPhone,
      discountPercent = 0,
      paymentMethod = 'Cash',
      branchId,
      notes
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart cannot be empty. Please add medicines before checkout.'
      });
    }

    const settings = (await SystemSettings.findOne()) || { taxRatePercent: 12 };
    const taxRate = settings.taxRatePercent || 12;

    const transactionNumber = await generateInvoiceNumber();
    const finalTransactionItems = [];
    const consumptionLogs = [];
    let grossSubtotal = 0;

    // Process each cart item through strict FEFO allocation & safe deduction
    for (const item of items) {
      const { medicineId, quantity } = item;
      const medQty = Number(quantity);

      if (medQty <= 0) {
        return res.status(400).json({ success: false, message: 'Item quantity must be greater than zero.' });
      }

      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({ success: false, message: `Medicine with ID ${medicineId} not found.` });
      }

      // Execute FEFO stock deduction
      const { allocations } = await executeFefoDeduction(medicineId, medQty, branchId);

      for (const alloc of allocations) {
        const itemSubtotal = parseFloat((alloc.allocatedQuantity * alloc.sellingPrice).toFixed(2));
        grossSubtotal += itemSubtotal;

        finalTransactionItems.push({
          medicineId: medicine._id,
          medicineName: medicine.name,
          batchId: alloc.batchId,
          batchNumber: alloc.batchNumber,
          quantity: alloc.allocatedQuantity,
          unitPrice: alloc.sellingPrice,
          subtotal: itemSubtotal,
          expiryDate: alloc.expiryDate
        });

        // Prepare consumption log
        consumptionLogs.push({
          medicineId: medicine._id,
          medicineName: medicine.name,
          batchId: alloc.batchId,
          batchNumber: alloc.batchNumber,
          quantity: alloc.allocatedQuantity,
          date: new Date(),
          userId: req.user ? req.user._id : null,
          branchId: branchId || null
        });
      }
    }

    // Calculate totals
    const discountAmt = parseFloat(((grossSubtotal * (Number(discountPercent) || 0)) / 100).toFixed(2));
    const taxableAmount = Math.max(0, grossSubtotal - discountAmt);
    const taxAmt = parseFloat(((taxableAmount * taxRate) / 100).toFixed(2));
    const grandTotal = parseFloat((taxableAmount + taxAmt).toFixed(2));

    // Save transaction
    const transaction = await Transaction.create({
      transactionNumber,
      date: new Date(),
      customerName: customerName ? customerName.trim() : 'Walk-in Customer',
      customerPhone: customerPhone ? customerPhone.trim() : '',
      items: finalTransactionItems,
      subtotal: grossSubtotal,
      discount: discountAmt,
      tax: taxAmt,
      grandTotal,
      paymentMethod: paymentMethod || 'Cash',
      userId: req.user ? req.user._id : null,
      staffName: req.user ? req.user.name : 'Cashier Staff',
      branchId: branchId || null,
      status: 'Completed',
      notes: notes || ''
    });

    // Save consumption records linked to transaction
    for (const log of consumptionLogs) {
      log.transactionId = transaction._id;
      log.transactionNumber = transaction.transactionNumber;
    }
    await ConsumptionRecord.insertMany(consumptionLogs);

    // Sync inventory alerts in background
    syncInventoryAlerts(branchId).catch(e => console.error('[Alert Sync Error]', e.message));

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully. Stock deducted via FEFO.',
      transaction
    });
  } catch (err) {
    next(err);
  }
};

// Get all transactions with date filtering and pagination
exports.getTransactions = async (req, res, next) => {
  try {
    const { startDate, endDate, paymentMethod, search, branch, page = 1, limit = 50 } = req.query;

    const query = {};
    if (paymentMethod && paymentMethod !== 'All') query.paymentMethod = paymentMethod;
    if (branch) query.branchId = branch;

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
        { transactionNumber: reg },
        { customerName: reg },
        { customerPhone: reg },
        { staffName: reg }
      ];
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      transactions
    });
  } catch (err) {
    next(err);
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    res.json({
      success: true,
      transaction
    });
  } catch (err) {
    next(err);
  }
};
