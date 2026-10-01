const express = require('express');
const router = express.Router();
const { askAssistant } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/ask', protect, askAssistant);

module.exports = router;
