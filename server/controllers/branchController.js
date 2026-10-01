const Branch = require('../models/Branch');
const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');

exports.getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort({ isMain: -1, name: 1 });
    res.json({
      success: true,
      count: branches.length,
      branches
    });
  } catch (err) {
    next(err);
  }
};

exports.createBranch = async (req, res, next) => {
  try {
    const { name, code, address, phone, email, isMain } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Branch name and unique code are required.' });
    }

    const branch = await Branch.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address || '',
      phone: phone || '',
      email: email || '',
      isMain: !!isMain
    });

    res.status(201).json({
      success: true,
      message: 'Branch created successfully.',
      branch
    });
  } catch (err) {
    next(err);
  }
};

// Redistribution recommendations between branches
exports.getRedistributionSuggestions = async (req, res, next) => {
  try {
    const branches = await Branch.find({ isActive: true });
    if (branches.length < 2) {
      return res.json({
        success: true,
        message: 'Redistribution requires at least 2 registered branches.',
        suggestions: []
      });
    }

    const medicines = await Medicine.find({ active: true });
    const suggestions = [];

    for (const med of medicines) {
      // Get stock per branch
      const branchStock = [];
      for (const br of branches) {
        const batches = await Batch.find({
          medicineId: med._id,
          branch: br._id,
          quantity: { $gt: 0 },
          status: { $ne: 'Expired' }
        });
        const total = batches.reduce((sum, b) => sum + b.quantity, 0);
        branchStock.push({ branch: br, stock: total });
      }

      // Check for surplus and deficit pairs
      const surplus = branchStock.filter(b => b.stock > med.reorderLevel * 2);
      const deficit = branchStock.filter(b => b.stock <= med.reorderLevel);

      for (const s of surplus) {
        for (const d of deficit) {
          const recommendedTransfer = Math.min(
            Math.floor((s.stock - med.reorderLevel) / 2),
            (med.reorderLevel * 2) - d.stock
          );
          if (recommendedTransfer > 5) {
            suggestions.push({
              medicineId: med._id,
              medicineName: med.name,
              sourceBranch: { id: s.branch._id, name: s.branch.name, stock: s.stock },
              destinationBranch: { id: d.branch._id, name: d.branch.name, stock: d.stock },
              recommendedTransferQuantity: recommendedTransfer,
              reason: `${s.branch.name} has surplus stock (${s.stock} units) while ${d.branch.name} is in low stock state (${d.stock} units, below threshold ${med.reorderLevel}).`
            });
          }
        }
      }
    }

    res.json({
      success: true,
      count: suggestions.length,
      suggestions
    });
  } catch (err) {
    next(err);
  }
};
