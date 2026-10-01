const express = require('express');
const router = express.Router();
const {
  getAllPredictions,
  getSinglePrediction,
  simulateScenario,
  getHealthScore,
  getAnomalies
} = require('../controllers/predictionController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllPredictions);
router.get('/health-score', protect, getHealthScore);
router.get('/anomalies', protect, getAnomalies);
router.post('/simulate', protect, simulateScenario);
router.get('/:id', protect, getSinglePrediction);

module.exports = router;
