const User = require('../models/User');

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

    res.status(201).json({
      success: true,
      message: 'Staff user created successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, role, isActive, phone, branch } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Protect against demoting or disabling the only admin
    if (user.role === 'admin' && (role === 'staff' || isActive === false)) {
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

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully.',
      user
    });
  } catch (err) {
    next(err);
  }
};
