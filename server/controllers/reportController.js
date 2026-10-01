const Transaction = require('../models/Transaction');
const ConsumptionRecord = require('../models/ConsumptionRecord');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Supplier = require('../models/Supplier');
const { generateMedicinePrediction } = require('../services/aiForecastingService');

// Helper to resolve date range filters
const resolveDateRange = (filter, startDate, endDate) => {
  const now = new Date();
  let start = new Date(0);
  let end = new Date();

  if (filter === 'today') {
    start = new Date();
    start.setHours(0, 0, 0, 0);
    end = new Date();
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'last7days') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
  } else if (filter === 'last30days') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
  } else if (filter === 'custom' && startDate) {
    start = new Date(startDate);
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }
  }

  return { start, end };
};

// Sales Report
exports.getSalesReport = async (req, res, next) => {
  try {
    const { filter = 'last30days', startDate, endDate, branchId } = req.query;
    const { start, end } = resolveDateRange(filter, startDate, endDate);

    const query = {
      date: { $gte: start, $lte: end },
      status: 'Completed'
    };
    if (branchId) query.branchId = branchId;

    const transactions = await Transaction.find(query).sort({ date: 1 });

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalUnitsSold = 0;
    const paymentBreakdown = { Cash: 0, UPI: 0, Card: 0 };
    const dailyMap = {};
    const medicineSalesMap = {};

    for (const t of transactions) {
      totalRevenue += t.grandTotal;
      totalDiscount += t.discount;
      totalTax += t.tax;
      paymentBreakdown[t.paymentMethod] = (paymentBreakdown[t.paymentMethod] || 0) + t.grandTotal;

      const day = new Date(t.date).toISOString().split('T')[0];
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, sales: 0, transactions: 0, units: 0 };
      }
      dailyMap[day].sales += t.grandTotal;
      dailyMap[day].transactions += 1;

      for (const item of t.items) {
        totalUnitsSold += item.quantity;
        dailyMap[day].units += item.quantity;

        const medName = item.medicineName;
        if (!medicineSalesMap[medName]) {
          medicineSalesMap[medName] = { name: medName, units: 0, revenue: 0 };
        }
        medicineSalesMap[medName].units += item.quantity;
        medicineSalesMap[medName].revenue += item.subtotal;
      }
    }

    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const topMedicines = Object.values(medicineSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    res.json({
      success: true,
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalTransactions: transactions.length,
        totalUnitsSold,
        totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        averageOrderValue: transactions.length > 0 ? parseFloat((totalRevenue / transactions.length).toFixed(2)) : 0
      },
      paymentBreakdown,
      dailyTrend,
      topMedicines
    });
  } catch (err) {
    next(err);
  }
};

// Consumption Report
exports.getConsumptionReport = async (req, res, next) => {
  try {
    const { filter = 'last30days', startDate, endDate, branchId } = req.query;
    const { start, end } = resolveDateRange(filter, startDate, endDate);

    const query = { date: { $gte: start, $lte: end } };
    if (branchId) query.branchId = branchId;

    const records = await ConsumptionRecord.find(query).sort({ date: 1 });

    const medicineMap = {};
    const dailyMap = {};

    for (const r of records) {
      const day = new Date(r.date).toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + r.quantity;

      const medId = r.medicineId.toString();
      if (!medicineMap[medId]) {
        medicineMap[medId] = {
          medicineId: medId,
          name: r.medicineName,
          totalConsumed: 0,
          batchesUsed: new Set()
        };
      }
      medicineMap[medId].totalConsumed += r.quantity;
      medicineMap[medId].batchesUsed.add(r.batchNumber);
    }

    const consumptionList = Object.values(medicineMap).map(m => ({
      medicineId: m.medicineId,
      name: m.name,
      totalConsumed: m.totalConsumed,
      batchesCount: m.batchesUsed.size
    })).sort((a, b) => b.totalConsumed - a.totalConsumed);

    const dailyTimeline = Object.entries(dailyMap).map(([date, quantity]) => ({ date, quantity })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      totalRecords: records.length,
      consumptionList,
      dailyTimeline
    });
  } catch (err) {
    next(err);
  }
};

// Inventory & Valuation Report
exports.getInventoryReport = async (req, res, next) => {
  try {
    const { branchId } = req.query;

    const batchQuery = { status: { $ne: 'Expired' } };
    if (branchId) batchQuery.branch = branchId;
    const batches = await Batch.find(batchQuery).populate('medicineId', 'name category brand reorderLevel maximumStock');

    let totalValuationPurchase = 0;
    let totalValuationSelling = 0;
    let totalStockUnits = 0;
    const categoryMap = {};

    for (const b of batches) {
      if (b.quantity <= 0) continue;
      const pVal = b.quantity * (b.purchasePrice || 0);
      const sVal = b.quantity * (b.sellingPrice || 0);
      totalValuationPurchase += pVal;
      totalValuationSelling += sVal;
      totalStockUnits += b.quantity;

      const cat = b.medicineId?.category || 'General';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, units: 0, value: 0 };
      }
      categoryMap[cat].units += b.quantity;
      categoryMap[cat].value += sVal;
    }

    res.json({
      success: true,
      summary: {
        totalStockUnits,
        totalBatches: batches.length,
        totalValuationPurchase: parseFloat(totalValuationPurchase.toFixed(2)),
        totalValuationSelling: parseFloat(totalValuationSelling.toFixed(2)),
        potentialProfit: parseFloat((totalValuationSelling - totalValuationPurchase).toFixed(2))
      },
      categoryDistribution: Object.values(categoryMap)
    });
  } catch (err) {
    next(err);
  }
};

// Expiry & Wastage Report
exports.getExpiryReport = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const query = { quantity: { $gt: 0 } };
    if (branchId) query.branch = branchId;

    const batches = await Batch.find(query).populate('medicineId', 'name genericName brand');
    const now = new Date();

    const categorized = {
      expired: [],
      criticalNearExpiry: [], // < 30 days
      nearExpiry: [], // 30 - 90 days
      moderate: [], // 90 - 180 days
      safe: [] // > 180 days
    };

    let totalWastageLoss = 0;
    let expiredLoss = 0;

    for (const b of batches) {
      const days = Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24));
      const val = b.quantity * (b.purchasePrice || 0);

      const item = {
        batchId: b._id,
        batchNumber: b.batchNumber,
        medicineName: b.medicineId?.name || 'Unknown',
        quantity: b.quantity,
        expiryDate: b.expiryDate,
        purchasePrice: b.purchasePrice,
        estimatedLoss: parseFloat(val.toFixed(2)),
        daysRemaining: days
      };

      if (days <= 0) {
        categorized.expired.push(item);
        expiredLoss += val;
      } else if (days <= 30) {
        categorized.criticalNearExpiry.push(item);
        totalWastageLoss += val;
      } else if (days <= 90) {
        categorized.nearExpiry.push(item);
      } else if (days <= 180) {
        categorized.moderate.push(item);
      } else {
        categorized.safe.push(item);
      }
    }

    res.json({
      success: true,
      summary: {
        expiredCount: categorized.expired.length,
        criticalNearExpiryCount: categorized.criticalNearExpiry.length,
        nearExpiryCount: categorized.nearExpiry.length,
        expiredFinancialLoss: parseFloat(expiredLoss.toFixed(2)),
        nearExpiryAtRiskValue: parseFloat(totalWastageLoss.toFixed(2))
      },
      categorized
    });
  } catch (err) {
    next(err);
  }
};

// Export to CSV helper
exports.exportReportCsv = async (req, res, next) => {
  try {
    const { type = 'sales', filter = 'last30days' } = req.query;

    if (type === 'sales') {
      const { start, end } = resolveDateRange(filter);
      const transactions = await Transaction.find({ date: { $gte: start, $lte: end } }).sort({ date: -1 });

      let csv = 'Transaction ID,Date,Customer Name,Customer Phone,Items Count,Subtotal,Discount,Tax,Grand Total,Payment Method,Staff\n';
      for (const t of transactions) {
        csv += `"${t.transactionNumber}","${new Date(t.date).toISOString()}","${t.customerName}","${t.customerPhone}",${t.items.length},${t.subtotal},${t.discount},${t.tax},${t.grandTotal},"${t.paymentMethod}","${t.staffName}"\n`;
      }

      res.header('Content-Type', 'text/csv');
      res.attachment(`medstock_sales_report_${filter}.csv`);
      return res.send(csv);
    }

    if (type === 'inventory') {
      const medicines = await Medicine.find({ active: true }).sort({ name: 1 });
      const batches = await Batch.find({ quantity: { $gt: 0 } });
      const now = new Date();

      let csv = 'Medicine Name,Generic Name,Brand,Category,Dosage Form,Barcode,Current Stock,Reorder Level,Max Stock,Status\n';
      for (const m of medicines) {
        const medBatches = batches.filter(b => b.medicineId.toString() === m._id.toString() && new Date(b.expiryDate) > now);
        const stock = medBatches.reduce((sum, b) => sum + b.quantity, 0);
        const status = stock === 0 ? 'Out of Stock' : (stock <= m.reorderLevel ? 'Low Stock' : 'Healthy');
        csv += `"${m.name}","${m.genericName}","${m.brand}","${m.category}","${m.dosageForm}","${m.barcode}",${stock},${m.reorderLevel},${m.maximumStock},"${status}"\n`;
      }

      res.header('Content-Type', 'text/csv');
      res.attachment(`medstock_inventory_report.csv`);
      return res.send(csv);
    }

    res.status(400).json({ success: false, message: 'Invalid export type specified.' });
  } catch (err) {
    next(err);
  }
};
