const express = require('express');
const router = express.Router();
const {
  getAlerts,
  triggerAlertSync,
  markAsRead,
  markAllAsRead,
  dismissAlert
} = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAlerts);
router.post('/sync', protect, triggerAlertSync);
router.put('/mark-all-read', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, dismissAlert);

module.exports = router;
