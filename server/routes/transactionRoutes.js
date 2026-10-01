const express = require('express');
const router = express.Router();
const {
  createSale,
  getTransactions,
  getTransactionById,
  previewCartFefo
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getTransactions)
  .post(protect, createSale);

router.post('/preview-fefo', protect, previewCartFefo);
router.get('/:id', protect, getTransactionById);

module.exports = router;
