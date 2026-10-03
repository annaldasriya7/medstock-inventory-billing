const Transaction = require('../models/Transaction');
const ConsumptionRecord = require('../models/ConsumptionRecord');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const SalesReturn = require('../models/SalesReturn');
const SystemSettings = require('../models/SystemSettings');
const { previewFefoAllocation, executeFefoDeduction } = require('../services/fefoService');
const { syncInventoryAlerts } = require('../services/alertService');
const { logStaffActivity } = require('../utils/auditLogger');

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
      transactionType: 'SALE',
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
      staffRole: req.user ? req.user.role : 'staff',
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

    // Record staff accountability log
    if (req.user) {
      await logStaffActivity({
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role,
        actionType: 'SALE_CREATED',
        description: `Created sale ${transaction.transactionNumber} for ₹${transaction.grandTotal.toFixed(2)} (${finalTransactionItems.length} items)`,
        referenceId: transaction._id.toString(),
        referenceModel: 'Transaction',
        details: {
          transactionNumber: transaction.transactionNumber,
          customerName: transaction.customerName,
          grandTotal: transaction.grandTotal,
          paymentMethod: transaction.paymentMethod
        }
      });
    }

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

// Get all transactions with date filtering, type filtering, pagination and summary
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, transactionType, startDate, endDate, paymentMethod, search, staffId, staffName, branch, page = 1, limit = 50 } = req.query;

    const query = {};
    const selectedType = type || transactionType;
    if (selectedType && selectedType !== 'All') {
      query.transactionType = selectedType;
    }
    if (paymentMethod && paymentMethod !== 'All') query.paymentMethod = paymentMethod;
    if (branch) query.branchId = branch;
    if (staffId) query.userId = staffId;
    if (staffName) query.staffName = new RegExp(staffName.trim(), 'i');

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

    // Summary statistics for SALE, PURCHASE, and RETURN
    const summaryAgg = await Transaction.aggregate([
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' }
        }
      }
    ]);

    const summary = {
      SALE: { count: 0, amount: 0 },
      PURCHASE: { count: 0, amount: 0 },
      RETURN: { count: 0, amount: 0 }
    };

    summaryAgg.forEach((item) => {
      const t = item._id || 'SALE';
      if (summary[t]) {
        summary[t].count = item.count;
        summary[t].amount = parseFloat((item.totalAmount || 0).toFixed(2));
      }
    });

    res.json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      summary,
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

// Log Bill Reprint (Does NOT alter stock, consumption, or create duplicate transaction)
exports.logBillReprint = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    if (req.user) {
      await logStaffActivity({
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role,
        actionType: 'BILL_REPRINTED',
        description: `Reprinted invoice ${transaction.transactionNumber}`,
        referenceId: transaction._id.toString(),
        referenceModel: 'Transaction',
        details: {
          transactionNumber: transaction.transactionNumber,
          customerName: transaction.customerName,
          grandTotal: transaction.grandTotal
        }
      });
    }

    res.json({
      success: true,
      message: 'Bill reprint activity recorded.',
      transaction
    });
  } catch (err) {
    next(err);
  }
};

// Process Sales Return (Return items from a completed bill)
exports.processSalesReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      medicineId,
      batchId,
      returnQuantity,
      reason = 'Customer return',
      condition = 'Resellable',
      notes = ''
    } = req.body;

    const qty = Number(returnQuantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Return quantity must be greater than zero.' });
    }

    const originalTxn = await Transaction.findById(id);
    if (!originalTxn) {
      return res.status(404).json({ success: false, message: 'Original bill not found.' });
    }

    if (originalTxn.transactionType && originalTxn.transactionType !== 'SALE') {
      return res.status(400).json({ success: false, message: 'Returns can only be processed against customer sales bills.' });
    }

    // Match item in bill
    const itemIndex = originalTxn.items.findIndex((it) => {
      const matchBatch = batchId && it.batchId && it.batchId.toString() === batchId.toString();
      const matchMed = medicineId && it.medicineId && it.medicineId.toString() === medicineId.toString();
      return matchBatch || matchMed;
    });

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Specified item was not found in this invoice.' });
    }

    const item = originalTxn.items[itemIndex];
    const alreadyReturned = item.returnedQuantity || 0;
    const remainingEligible = item.quantity - alreadyReturned;

    if (qty > remainingEligible) {
      return res.status(400).json({
        success: false,
        message: `Cannot return ${qty} units. Maximum returnable quantity is ${remainingEligible} (Sold: ${item.quantity}, Already Returned: ${alreadyReturned}).`
      });
    }

    const isResellable = condition === 'Resellable';
    const unitPrice = item.unitPrice || 0;
    const refundAmount = parseFloat((qty * unitPrice).toFixed(2));

    // Update batch and medicine stock ONLY IF Resellable
    if (isResellable && item.batchId) {
      const batch = await Batch.findById(item.batchId);
      if (batch) {
        batch.quantity += qty;
        if (typeof batch.updateStatus === 'function') {
          batch.updateStatus();
        }
        await batch.save();
      }

      // Recalculate medicine current stock
      const activeBatches = await Batch.find({ medicineId: item.medicineId, status: { $ne: 'Expired' } });
      const totalStock = activeBatches.reduce((sum, b) => sum + b.quantity, 0);
      await Medicine.findByIdAndUpdate(item.medicineId, {
        currentStock: totalStock,
        isAvailable: totalStock > 0
      });
    }

    // Update returned quantity on original transaction
    item.returnedQuantity = alreadyReturned + qty;

    // Check if entire bill is refunded
    const totalSold = originalTxn.items.reduce((sum, it) => sum + it.quantity, 0);
    const totalReturned = originalTxn.items.reduce((sum, it) => sum + (it.returnedQuantity || 0), 0);
    if (totalReturned >= totalSold) {
      originalTxn.status = 'Refunded';
    }
    await originalTxn.save();

    // Generate Return Reference Number
    const countTodayReturns = await SalesReturn.countDocuments();
    const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(countTodayReturns + 1).padStart(4, '0')}`;

    // Create SalesReturn record
    const returnRecord = await SalesReturn.create({
      returnNumber,
      originalTransactionId: originalTxn._id,
      originalTransactionNumber: originalTxn.transactionNumber,
      customerName: originalTxn.customerName,
      customerPhone: originalTxn.customerPhone,
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      batchId: item.batchId,
      batchNumber: item.batchNumber,
      returnQuantity: qty,
      unitPrice,
      refundAmount,
      reason,
      condition,
      isResellable,
      notes: notes || '',
      returnedBy: {
        userId: req.user ? req.user._id : null,
        staffName: req.user ? req.user.name : 'Staff',
        role: req.user ? req.user.role : 'staff'
      },
      date: new Date()
    });

    // Create RETURN Transaction for unified transactions history
    const returnTxn = await Transaction.create({
      transactionNumber: returnNumber,
      transactionType: 'RETURN',
      originalTransactionId: originalTxn._id,
      originalTransactionNumber: originalTxn.transactionNumber,
      returnReason: reason,
      isResellable,
      date: new Date(),
      customerName: originalTxn.customerName,
      customerPhone: originalTxn.customerPhone,
      items: [{
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        quantity: qty,
        unitPrice,
        subtotal: refundAmount,
        expiryDate: item.expiryDate,
        returnedQuantity: 0
      }],
      subtotal: refundAmount,
      discount: 0,
      tax: 0,
      grandTotal: refundAmount,
      paymentMethod: originalTxn.paymentMethod || 'Cash',
      userId: req.user ? req.user._id : null,
      staffName: req.user ? req.user.name : 'Staff',
      staffRole: req.user ? req.user.role : 'staff',
      status: 'Completed',
      notes: `Sales return against ${originalTxn.transactionNumber}. Reason: ${reason}. Condition: ${condition}. ${notes}`
    });

    // Record Staff Activity in Audit Log
    if (req.user) {
      await logStaffActivity({
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role,
        actionType: 'MEDICINE_RETURNED',
        description: `Processed return ${returnNumber} for bill ${originalTxn.transactionNumber}: ${qty} units of ${item.medicineName} (Refund: ₹${refundAmount.toFixed(2)}, Condition: ${condition})`,
        referenceId: returnTxn._id.toString(),
        referenceModel: 'Transaction',
        details: {
          returnNumber,
          originalTransactionNumber: originalTxn.transactionNumber,
          medicineName: item.medicineName,
          batchNumber: item.batchNumber,
          returnQuantity: qty,
          refundAmount,
          reason,
          condition,
          isResellable
        }
      });
    }

    // Sync inventory alerts in background
    syncInventoryAlerts(originalTxn.branchId).catch(e => console.error('[Alert Sync Error]', e.message));

    res.status(201).json({
      success: true,
      message: isResellable
        ? `Sales return processed. ₹${refundAmount.toFixed(2)} refunded and ${qty} units restored to inventory.`
        : `Sales return processed. ₹${refundAmount.toFixed(2)} refunded. Damaged units were NOT returned to inventory.`,
      returnRecord,
      returnTransaction: returnTxn
    });
  } catch (err) {
    next(err);
  }
};


