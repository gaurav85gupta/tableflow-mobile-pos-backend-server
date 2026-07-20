// server/app/jobs/index.js
//
// Scheduled/background task registry. Phase B ships exactly one real job —
// expiring subscriptions that have silently passed their `expiresAt` — as
// proof this mechanism works end-to-end; it is deliberately simple (a
// setInterval, not a queue library) since there's only one job to run so
// far. If Phase C adds several jobs with retries/concurrency needs, this is
// the file to replace with a real job queue (e.g. Bull/BullMQ backed by
// Redis) — nothing outside this file should need to change when that happens.

const Subscription = require('../models/subscription.model');
const { SUBSCRIPTION_STATUS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.GENERAL);
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

async function expireOverdueSubscriptions() {
  const result = await Subscription.updateMany(
    { status: SUBSCRIPTION_STATUS.ACTIVE, expiresAt: { $lt: new Date() } },
    { status: SUBSCRIPTION_STATUS.EXPIRED },
  );
  if (result.modifiedCount > 0) {
    log.info('Expired overdue subscriptions', { count: result.modifiedCount });
  }
}

function startBackgroundJobs() {
  setInterval(() => {
    expireOverdueSubscriptions().catch((err) => log.error('Subscription expiry job failed', { error: err.message }));
  }, CHECK_INTERVAL_MS);
  log.info('Background jobs started');
}

module.exports = { startBackgroundJobs, expireOverdueSubscriptions };
