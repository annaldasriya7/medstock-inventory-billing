const AuditLog = require('../models/AuditLog');

/**
 * Centrally records staff activity for accountability and compliance auditing
 */
const logStaffActivity = async ({
  userId,
  staffName,
  role,
  actionType,
  description,
  referenceId = '',
  referenceModel = '',
  details = {}
}) => {
  try {
    if (!userId || !staffName) return null;

    const log = await AuditLog.create({
      userId,
      staffName,
      role: role || 'staff',
      actionType,
      description,
      referenceId,
      referenceModel,
      details,
      date: new Date()
    });

    return log;
  } catch (err) {
    console.error('[Audit Logger Error]', err.message);
    return null;
  }
};

module.exports = { logStaffActivity };
