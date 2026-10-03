const express = require('express');
const router = express.Router();
const {
  receiveStock,
  getStockReceipts,
  getStockReceiptById
} = require('../controllers/stockReceiptController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getStockReceipts)
  .post(authorize('admin', 'pharmacist'), receiveStock);

router.route('/:id')
  .get(getStockReceiptById);

module.exports = router;
