const SystemSettings = require('../models/SystemSettings');

exports.getSettings = async (req, res, next) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    }
    res.json({
      success: true,
      settings
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }

    res.json({
      success: true,
      message: 'System settings updated successfully.',
      settings
    });
  } catch (err) {
    next(err);
  }
};
