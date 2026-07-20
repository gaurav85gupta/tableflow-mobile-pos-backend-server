// server/app/services/activityLog.service.js
//
// C.9 Activity Logs. A single `record()` function every other service calls
// (fire-and-forget style, same pattern as tenant.middleware.js's
// touchLastSeen) right after a state-changing action succeeds. Kept as its
// own tiny service rather than folded into each domain service, since
// EVERY domain service needs to call it -- a shared cross-cutting concern,
// not something owned by one domain.

const activityLogRepository = require('../repositories/activityLog.repository');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.SECURITY);

/**
 * @param {object} params
 * @param {string} params.action - one of config/constants.js ACTIVITY_ACTIONS
 * @param {'super_admin'|'user'|'system'} params.actorType
 * @param {string} [params.actorId]
 * @param {string} [params.actorLabel] - denormalized display name
 * @param {string} [params.restaurantId]
 * @param {object} [params.details]
 * @param {string} [params.ipAddress]
 */
async function record({ action, actorType, actorId = null, actorLabel = null, restaurantId = null, details = {}, ipAddress = null }) {
  try {
    await activityLogRepository.create({ action, actorType, actorId, actorLabel, restaurantId, details, ipAddress });
  } catch (err) {
    // Never let a logging failure break the actual business operation that
    // triggered it -- log the failure itself and move on.
    log.error('Failed to record activity log entry', { action, error: err.message });
  }
}

async function listLogs(filters) {
  return activityLogRepository.list(filters);
}

async function listRecent(limit) {
  return activityLogRepository.listRecent(limit);
}

module.exports = { record, listLogs, listRecent };
