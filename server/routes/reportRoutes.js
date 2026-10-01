const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getConsumptionReport,
  getInventoryReport,
  getExpiryReport,
  exportReportCsv
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/sales', protect, getSalesReport);
router.get('/consumption', protect, getConsumptionReport);
router.get('/inventory', protect, getInventoryReport);
router.get('/expiry', protect, getExpiryReport);
router.get('/export-csv', protect, exportReportCsv);

module.exports = router;
