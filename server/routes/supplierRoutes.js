const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
} = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, authorize('admin'), createSupplier);

router.route('/:id')
  .put(protect, authorize('admin'), updateSupplier)
  .delete(protect, authorize('admin'), deleteSupplier);

module.exports = router;
