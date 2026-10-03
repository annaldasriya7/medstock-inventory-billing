const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  checkSetupStatus,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.get('/setup-status', checkSetupStatus);
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Password Management Routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);

module.exports = router;

