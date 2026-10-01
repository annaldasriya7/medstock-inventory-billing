const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'medstock_fallback_secret_key_2026_jwt', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Check if initial admin setup is required (when database is empty)
exports.checkSetupStatus = async (req, res, next) => {
  try {
    const userCount = await User.countDocuments();
    res.json({
      success: true,
      isSetupRequired: userCount === 0,
      userCount
    });
  } catch (err) {
    next(err);
  }
};

// Register user
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, branch, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // If this is the very first user in the system, automatically grant Admin role
    const totalUsers = await User.countDocuments();
    const assignedRole = totalUsers === 0 ? 'admin' : (role || 'staff');

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      branch: branch || null,
      phone: phone || ''
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch
      }
    });
  } catch (err) {
    next(err);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get current user profile
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
};
