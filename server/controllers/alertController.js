const Alert = require('../models/Alert');
const { syncInventoryAlerts } = require('../services/alertService');

// Get all alerts
exports.getAlerts = async (req, res, next) => {
  try {
    const { type, severity, isRead, branchId, limit = 100 } = req.query;

    const query = {};
    if (type && type !== 'All') query.type = type;
    if (severity && severity !== 'All') query.severity = severity;
    if (isRead !== undefined && isRead !== 'All') query.isRead = isRead === 'true';
    if (branchId) query.branchId = branchId;

    const alerts = await Alert.find(query)
      .sort({ severity: 1, date: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Alert.countDocuments({ isRead: false });

    res.json({
      success: true,
      count: alerts.length,
      unreadCount,
      alerts
    });
  } catch (err) {
    next(err);
  }
};

// Manually trigger alert synchronization
exports.triggerAlertSync = async (req, res, next) => {
  try {
    const { branchId } = req.body;
    const activeAlerts = await syncInventoryAlerts(branchId);
    res.json({
      success: true,
      message: 'Alerts synchronized with current inventory.',
      count: activeAlerts.length,
      alerts: activeAlerts
    });
  } catch (err) {
    next(err);
  }
};

// Mark single alert as read
exports.markAsRead = async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    res.json({
      success: true,
      alert
    });
  } catch (err) {
    next(err);
  }
};

// Mark all alerts as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Alert.updateMany({ isRead: false }, { isRead: true });
    res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    next(err);
  }
};

// Dismiss / delete alert
exports.dismissAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    res.json({
      success: true,
      message: 'Alert dismissed.'
    });
  } catch (err) {
    next(err);
  }
};
