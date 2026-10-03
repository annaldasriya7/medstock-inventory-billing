const express = require('express');
const router = express.Router();
const {
  adjustStock,
  getStockAdjustments,
  getStockAdjustmentById
} = require('../controllers/stockAdjustmentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getStockAdjustments)
  .post(authorize('admin', 'pharmacist'), adjustStock);

router.route('/:id')
  .get(getStockAdjustmentById);

module.exports = router;
