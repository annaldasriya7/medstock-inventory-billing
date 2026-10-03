const crypto = require('crypto');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { logStaffActivity } = require('../utils/auditLogger');

// @desc    Get all staff users
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new staff user
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, branch, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'staff',
      branch: branch || null,
      phone: phone || ''
    });

    if (req.user) {
      await logStaffActivity({
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role,
        actionType: 'STAFF_CREATED',
        description: `Created new staff account for ${user.name} (${user.email}) with role "${user.role}"`,
        referenceId: user._id.toString(),
        referenceModel: 'User',
        details: { name: user.name, email: user.email, role: user.role }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Staff user created successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        phone: user.phone
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update staff user details / role / status
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res, next) => {
  try {
    const { name, role, isActive, phone, branch, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Protect against demoting or disabling the only admin
    if (user.role === 'admin' && ((role && role !== 'admin') || isActive === false)) {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote or deactivate the only active Administrator.'
        });
      }
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (phone !== undefined) user.phone = phone;
    if (branch !== undefined) user.branch = branch;
    if (password && password.trim().length >= 6) {
      user.password = password;
    }

    await user.save();

    if (req.user) {
      await logStaffActivity({
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role,
        actionType: 'STAFF_UPDATED',
        description: `Updated profile for staff member ${user.name} (Role: ${user.role}, Active: ${user.isActive})`,
        referenceId: user._id.toString(),
        referenceModel: 'User',
        details: { name: user.name, role: user.role, isActive: user.isActive }
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        phone: user.phone
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get staff activity audit logs
// @route   GET /api/users/activity
// @access  Private (Admin, Pharmacist)
exports.getStaffActivity = async (req, res, next) => {
  try {
    const { staffId, actionType, startDate, endDate, search, page = 1, limit = 50 } = req.query;

    const query = {};

    if (staffId && staffId !== 'All') {
      query.userId = staffId;
    }

    if (actionType && actionType !== 'All') {
      query.actionType = actionType;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.date.$lte = eDate;
      }
    }

    if (search) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [
        { staffName: reg },
        { actionType: reg },
        { description: reg },
        { referenceId: reg }
      ];
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      logs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin reset password for staff member (generates secure temporary password)
// @route   POST /api/users/:id/reset-password
// @access  Private (Admin only)
exports.adminResetPassword = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Staff account not found.'
      });
    }

    // Generate secure 10-character temporary password (e.g. MedStock@9X2K)
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const temporaryPassword = `MedStock@${randomSuffix}`;

    targetUser.password = temporaryPassword;
    targetUser.mustChangePassword = true;
    targetUser.passwordResetOtpHash = null;
    targetUser.passwordResetOtpExpires = null;
    targetUser.passwordResetOtpAttempts = 0;
    targetUser.passwordResetRequestedAt = null;

    // Save targetUser (pre-save middleware hashes password and sets passwordChangedAt)
    await targetUser.save();

    if (req.user) {
      await logStaffActivity({
        userId: req.user._id,
        staffName: req.user.name,
        role: req.user.role,
        actionType: 'STAFF_UPDATED',
        description: `Admin ${req.user.name} reset password for ${targetUser.name} (${targetUser.email}). Temporary password generated.`,
        referenceId: targetUser._id.toString(),
        referenceModel: 'User',
        details: {
          targetUserId: targetUser._id,
          targetStaffName: targetUser.name,
          targetEmail: targetUser.email,
          action: 'PASSWORD_RESET_BY_ADMIN'
        }
      });
    }

    res.json({
      success: true,
      message: `Password has been reset successfully for ${targetUser.name}.`,
      temporaryPassword,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        mustChangePassword: true
      }
    });
  } catch (err) {
    next(err);
  }
};

