const express = require('express');
const router = express.Router();
const {
  getQuarantineOverview,
  moveToQuarantine,
  performQuarantineAction,
  getQuarantineRecords
} = require('../controllers/quarantineController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getQuarantineOverview);
router.get('/records', getQuarantineRecords);
router.post('/move', authorize('admin', 'pharmacist'), moveToQuarantine);
router.post('/action', authorize('admin', 'pharmacist'), performQuarantineAction);

module.exports = router;
