const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Transaction = require('../models/Transaction');
const Alert = require('../models/Alert');
const Supplier = require('../models/Supplier');
const ConsumptionRecord = require('../models/ConsumptionRecord');
const { generateMedicinePrediction, calculateInventoryHealthScore } = require('./aiForecastingService');

/**
 * AI Inventory Assistant Service
 * Strictly grounded in real database data without hallucination.
 * Strictly adheres to Medical Safety: NO diagnosis, NO dosage, NO treatment advice.
 */
const answerInventoryQuery = async (queryText) => {
  const query = queryText.toLowerCase().trim();

  // 1. Safety Check: Deny medical diagnosis or prescription advice
  const medicalKeywords = [
    'diagnose', 'symptom', 'disease', 'headache', 'fever', 'dosage',
    'how many pills', 'treatment', 'cure', 'prescribe', 'side effect', 'take medicine'
  ];
  const hasMedicalAdviceIntent = medicalKeywords.some(kw => query.includes(kw)) &&
    !query.includes('sales') && !query.includes('stock') && !query.includes('expiry') && !query.includes('inventory');

  if (hasMedicalAdviceIntent) {
    return {
      answer: "I am MedStock AI's Inventory Assistant. In compliance with medical safety standards, I cannot provide clinical diagnosis, symptom evaluation, or medicine dosage guidance. Please consult a qualified physician or pharmacist for medical treatment.",
      category: 'medical_safety_guardrail',
      data: null
    };
  }

  // 2. Today's sales query
  if (query.includes('today') && (query.includes('sale') || query.includes('revenue') || query.includes('billing') || query.includes('earn'))) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'Completed'
    });

    const totalSales = transactions.reduce((sum, t) => sum + t.grandTotal, 0);
    const totalTransactions = transactions.length;
    const totalUnits = transactions.reduce((sum, t) => sum + t.items.reduce((iSum, item) => iSum + item.quantity, 0), 0);

    if (totalTransactions === 0) {
      return {
        answer: "There are currently 0 completed sales recorded today. The register has processed 0 transactions.",
        category: 'sales',
        data: { totalSales: 0, transactionCount: 0, unitsSold: 0 }
      };
    }

    return {
      answer: `Today's actual sales total is ₹${totalSales.toFixed(2)} across ${totalTransactions} completed transactions, with ${totalUnits} units of medicine dispensed.`,
      category: 'sales',
      data: { totalSales, transactionCount: totalTransactions, unitsSold: totalUnits }
    };
  }

  // 3. Stock-out Risk / Low Stock query
  if (query.includes('stock-out') || query.includes('stock out') || query.includes('shortage') || query.includes('run out')) {
    const medicines = await Medicine.find({ active: true });
    if (medicines.length === 0) {
      return {
        answer: "The inventory database currently has 0 registered medicines. No stock-out risks detected.",
        category: 'stockout_risk',
        data: []
      };
    }

    const atRisk = [];
    for (const med of medicines) {
      const pred = await generateMedicinePrediction(med._id);
      if (pred.stockoutRiskLevel === 'Critical' || pred.stockoutRiskLevel === 'High') {
        atRisk.push({
          name: med.name,
          currentStock: pred.currentStock,
          risk: pred.stockoutRiskLevel,
          daysToStockout: pred.estimatedDaysToStockout,
          reorderQty: pred.reorderRecommendedQty
        });
      }
    }

    if (atRisk.length === 0) {
      return {
        answer: "All current medicines have sufficient stock reserves. No medicines are flagged at High or Critical stock-out risk.",
        category: 'stockout_risk',
        data: []
      };
    }

    const medNames = atRisk.map(m => `• ${m.name}: ${m.currentStock} units in stock (${m.risk} risk, ~${m.daysToStockout} days remaining)`).join('\n');
    return {
      answer: `The following ${atRisk.length} medicine(s) are at elevated stock-out risk based on current consumption and supplier lead times:\n\n${medNames}\n\nRecommended reorder quantities have been calculated for each item.`,
      category: 'stockout_risk',
      data: atRisk
    };
  }

  // 4. Expiry query
  if (query.includes('expire') || query.includes('expiry') || query.includes('wastage')) {
    const now = new Date();
    const future90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const nearBatches = await Batch.find({
      quantity: { $gt: 0 },
      expiryDate: { $lte: future90Days }
    }).populate('medicineId', 'name');

    if (nearBatches.length === 0) {
      return {
        answer: "There are currently no active batches expiring within the next 90 days in the database.",
        category: 'expiry',
        data: []
      };
    }

    const items = nearBatches.map(b => {
      const days = Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24));
      const status = days <= 0 ? 'ALREADY EXPIRED' : `expires in ${days} days`;
      return `• ${b.medicineId?.name || 'Medicine'} (Batch ${b.batchNumber}): ${b.quantity} units, ${status} (${new Date(b.expiryDate).toLocaleDateString()})`;
    }).join('\n');

    return {
      answer: `Found ${nearBatches.length} batch(es) nearing or past expiry:\n\n${items}\n\nStrict First-Expire-First-Out (FEFO) dispensing is active to minimize wastage.`,
      category: 'expiry',
      data: nearBatches
    };
  }

  // 5. Total Inventory & Health Score query
  if (query.includes('inventory') || query.includes('total stock') || query.includes('health') || query.includes('overview')) {
    const medCount = await Medicine.countDocuments({ active: true });
    const batchCount = await Batch.countDocuments({ quantity: { $gt: 0 } });
    const batches = await Batch.find({ quantity: { $gt: 0 } });
    const totalUnits = batches.reduce((sum, b) => sum + b.quantity, 0);
    const health = await calculateInventoryHealthScore();

    return {
      answer: `Inventory Overview:\n• Total Active Medicines: ${medCount}\n• Active Batches: ${batchCount}\n• Total Units in Stock: ${totalUnits}\n• Inventory Health Score: ${health.score}/100 (${health.rating})\n\n${health.explanation}`,
      category: 'inventory_overview',
      data: { medCount, batchCount, totalUnits, healthScore: health.score }
    };
  }

  // 6. Specific Medicine lookup query (e.g., "Tell me about Paracetamol" or "Do we have Amoxicillin?")
  const medicines = await Medicine.find({ active: true });
  for (const med of medicines) {
    if (query.includes(med.name.toLowerCase()) || (med.genericName && query.includes(med.genericName.toLowerCase()))) {
      const medBatches = await Batch.find({ medicineId: med._id, quantity: { $gt: 0 } }).sort({ expiryDate: 1 });
      const totalStock = medBatches.reduce((sum, b) => sum + b.quantity, 0);
      const pred = await generateMedicinePrediction(med._id);

      const batchInfo = medBatches.length > 0
        ? medBatches.map(b => `  - Batch ${b.batchNumber}: ${b.quantity} units, exp ${new Date(b.expiryDate).toLocaleDateString()}`).join('\n')
        : '  - No active batches in stock.';

      return {
        answer: `Medicine Details: ${med.name} (${med.genericName || 'N/A'})\n• Total Stock: ${totalStock} units\n• Reorder Level: ${med.reorderLevel} units\n• Estimated Stock Duration: ${pred.estimatedDaysToStockout} days\n• Stockout Risk: ${pred.stockoutRiskLevel}\n• Active Batches:\n${batchInfo}\n• AI Insight: ${pred.explanation}`,
        category: 'medicine_lookup',
        data: { medicine: med, totalStock, batches: medBatches, prediction: pred }
      };
    }
  }

  // 7. Reorder Recommendations query
  if (query.includes('reorder') || query.includes('procurement') || query.includes('buy') || query.includes('purchase order')) {
    const toReorder = [];
    for (const med of medicines) {
      const pred = await generateMedicinePrediction(med._id);
      if (pred.reorderRecommendedQty > 0) {
        toReorder.push({
          name: med.name,
          current: pred.currentStock,
          reorder: pred.reorderRecommendedQty,
          leadTime: pred.supplierLeadTimeDays
        });
      }
    }

    if (toReorder.length === 0) {
      return {
        answer: "No medicines currently require reordering based on demand forecasts and safety buffer levels.",
        category: 'reorder',
        data: []
      };
    }

    const list = toReorder.map(item => `• ${item.name}: Current ${item.current} units → Reorder ${item.reorder} units (Lead Time: ${item.leadTime} days)`).join('\n');
    return {
      answer: `Smart Reorder Recommendations for ${toReorder.length} item(s):\n\n${list}\n\nNote: As a safety guideline, purchase orders require administrator approval prior to issuance.`,
      category: 'reorder',
      data: toReorder
    };
  }

  // 8. Fallback when data is unavailable or query is unmapped
  return {
    answer: "I don't have enough data in the database to answer this specific inquiry. You can ask me about today's sales, stock-out risks, expiring batches, total inventory, or specific medicine stock levels.",
    category: 'fallback',
    data: null
  };
};

module.exports = {
  answerInventoryQuery
};
