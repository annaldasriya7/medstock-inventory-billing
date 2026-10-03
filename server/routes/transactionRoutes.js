const express = require('express');
const router = express.Router();
const {
  createSale,
  getTransactions,
  getTransactionById,
  previewCartFefo,
  logBillReprint,
  processSalesReturn
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getTransactions)
  .post(protect, createSale);

router.post('/preview-fefo', protect, previewCartFefo);
router.get('/:id', protect, getTransactionById);
router.post('/:id/reprint-log', protect, logBillReprint);
router.post('/:id/return', protect, processSalesReturn);

module.exports = router;
