const express = require('express');
const router = express.Router();
const { getBranches, createBranch, getRedistributionSuggestions } = require('../controllers/branchController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getBranches)
  .post(protect, authorize('admin'), createBranch);

router.get('/redistribution', protect, getRedistributionSuggestions);

module.exports = router;
