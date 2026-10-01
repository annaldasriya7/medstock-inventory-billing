const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin')); // Only Admin can manage staff users

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser);

module.exports = router;
