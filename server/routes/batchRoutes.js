const express = require('express');
const router = express.Router();
const {
  getBatches,
  createOrUpdateBatch,
  updateBatch,
  deleteBatch
} = require('../controllers/batchController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getBatches)
  .post(protect, createOrUpdateBatch); // Permitted staff and admin can receive batches

router.route('/:id')
  .put(protect, updateBatch)
  .delete(protect, authorize('admin'), deleteBatch);

module.exports = router;
