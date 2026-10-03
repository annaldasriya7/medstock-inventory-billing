const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  getStaffActivity,
  adminResetPassword
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Staff Activity Log accessible by Admin and Pharmacist
router.get('/activity', authorize('admin', 'pharmacist'), getStaffActivity);

// Staff Management endpoints (Admin only)
router.route('/')
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), createUser);

router.route('/:id')
  .put(authorize('admin'), updateUser);

router.post('/:id/reset-password', authorize('admin'), adminResetPassword);

module.exports = router;

