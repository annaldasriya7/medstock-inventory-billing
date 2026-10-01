const express = require('express');
const router = express.Router();
const { getConsumptionHistory } = require('../controllers/consumptionController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getConsumptionHistory);

module.exports = router;
