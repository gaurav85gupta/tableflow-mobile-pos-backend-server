// server/app/services/subscription.service.js
//
// B.10 Subscription Foundation / C.5 Subscription Management. Payment
// gateway integration is explicitly out of scope (per both phase briefs) --
// `renewSubscription` just extends `expiresAt` and resets status to ACTIVE;
// wiring it to a real payment event is a later-phase concern.

const subscriptionRepository = require('../repositories/subscription.repository');
const activityLogService = require('./activityLog.service');
const AppError = require('../utils/AppError');
const { SUBSCRIPTION_STATUS, ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.GENERAL);

/** C.5 Grace Period -- how many days past expiry a lapsed subscription stays in GRACE_PERIOD before flipping to EXPIRED. */
const GRACE_PERIOD_DAYS = 3;

async function getSubscription(restaurantId) {
  const subscription = await subscriptionRepository.findByRestaurant(restaurantId);
  if (!subscription) throw AppError.notFound('Subscription not found for this restaurant.');
  return subscription;
}

/**
 * Returns the subscription with its status recomputed against the current
 * date if it silently lapsed: ACTIVE/TRIAL -> GRACE_PERIOD (for
 * GRACE_PERIOD_DAYS) -> EXPIRED. This is where C.5's "Grace Period"
 * requirement is actually implemented -- not a separate status a Super
 * Admin sets manually, but a time-based transition every read passes through.
 */
async function getEffectiveStatus(restaurantId) {
  const subscription = await getSubscription(restaurantId);
  const now = new Date();

  if ([SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL].includes(subscription.status) && subscription.expiresAt < now) {
    const graceEndsAt = new Date(subscription.expiresAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const newStatus = now < graceEndsAt ? SUBSCRIPTION_STATUS.GRACE_PERIOD : SUBSCRIPTION_STATUS.EXPIRED;
    const updated = await subscriptionRepository.update(restaurantId, { status: newStatus });
    log.info('Subscription status recomputed', { restaurantId, newStatus });
    return updated;
  }

  if (subscription.status === SUBSCRIPTION_STATUS.GRACE_PERIOD) {
    const graceEndsAt = new Date(subscription.expiresAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    if (now >= graceEndsAt) {
      const updated = await subscriptionRepository.update(restaurantId, { status: SUBSCRIPTION_STATUS.EXPIRED });
      log.info('Subscription grace period ended, now expired', { restaurantId });
      return updated;
    }
  }

  return subscription;
}

async function changePlan(restaurantId, { plan, expiresAt, features }, actor) {
  const subscription = await subscriptionRepository.update(restaurantId, {
    plan,
    expiresAt,
    features,
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });
  if (!subscription) throw AppError.notFound('Subscription not found for this restaurant.');
  log.info('Subscription plan changed', { restaurantId, plan });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.SUBSCRIPTION_CHANGED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { plan, expiresAt, features },
  });
  return subscription;
}

/** C.5 Renewal -- extends expiry from either "now" or the current expiry date, whichever is later (so renewing early doesn't lose remaining time). */
async function renewSubscription(restaurantId, { extendByDays }, actor) {
  const subscription = await subscriptionRepository.findByRestaurant(restaurantId);
  if (!subscription) throw AppError.notFound('Subscription not found for this restaurant.');

  const base = subscription.expiresAt > new Date() ? subscription.expiresAt : new Date();
  const newExpiresAt = new Date(base.getTime() + extendByDays * 24 * 60 * 60 * 1000);

  const updated = await subscriptionRepository.update(restaurantId, {
    expiresAt: newExpiresAt,
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });
  log.info('Subscription renewed', { restaurantId, newExpiresAt });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.SUBSCRIPTION_RENEWED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { extendByDays, newExpiresAt },
  });
  return updated;
}

async function suspendSubscription(restaurantId, actor) {
  const subscription = await subscriptionRepository.update(restaurantId, { status: SUBSCRIPTION_STATUS.CANCELLED });
  if (!subscription) throw AppError.notFound('Subscription not found for this restaurant.');
  log.info('Subscription suspended', { restaurantId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.SUBSCRIPTION_SUSPENDED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
  });
  return subscription;
}

module.exports = { getSubscription, getEffectiveStatus, changePlan, renewSubscription, suspendSubscription, GRACE_PERIOD_DAYS };
