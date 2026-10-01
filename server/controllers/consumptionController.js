const ConsumptionRecord = require('../models/ConsumptionRecord');

exports.getConsumptionHistory = async (req, res, next) => {
  try {
    const { medicineId, startDate, endDate, branchId, page = 1, limit = 50 } = req.query;

    const query = {};
    if (medicineId) query.medicineId = medicineId;
    if (branchId) query.branchId = branchId;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.date.$lte = eDate;
      }
    }

    const total = await ConsumptionRecord.countDocuments(query);
    const records = await ConsumptionRecord.find(query)
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
