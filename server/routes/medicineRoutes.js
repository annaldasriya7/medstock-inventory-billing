const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  scanLookup
} = require('../controllers/medicineController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getMedicines)
  .post(protect, createMedicine); // Both admin and staff can register medicines per Req 6 & 9

router.post('/scan-lookup', protect, scanLookup);

router.route('/:id')
  .get(protect, getMedicineById)
  .put(protect, updateMedicine)
  .delete(protect, authorize('admin'), deleteMedicine);

module.exports = router;
