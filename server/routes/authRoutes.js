const express = require('express');
const router = express.Router();
const { register, login, getMe, checkSetupStatus } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.get('/setup-status', checkSetupStatus);
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
