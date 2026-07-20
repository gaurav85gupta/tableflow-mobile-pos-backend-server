// server/app/services/featureFlag.service.js
//
// B.11 Feature Flag Foundation / C.6 Feature Flag Management. A flag can
// only be turned ON if the restaurant's active subscription entitles it
// (see subscription.service.js `features` list) -- this service is where
// that cross-check happens, so a suspended/downgraded plan can't be
// bypassed by directly flipping a flag.

const featureFlagRepository = require('../repositories/featureFlag.repository');
const subscriptionService = require('./subscription.service');
const activityLogService = require('./activityLog.service');
const AppError = require('../utils/AppError');
const { FEATURE_KEYS, ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.GENERAL);

/** Called right after login (see B.11: "Android app login ke baad feature configuration receive karegi"). */
async function getFlagsForRestaurant(restaurantId) {
  let flagDoc = await featureFlagRepository.findByRestaurant(restaurantId);
  if (!flagDoc) {
    flagDoc = await featureFlagRepository.createDefault(restaurantId);
  }
  return Object.fromEntries(flagDoc.flags);
}

async function setFlag(restaurantId, key, value, actor) {
  if (!Object.values(FEATURE_KEYS).includes(key)) {
    throw AppError.badRequest(`Unknown feature key: ${key}`);
  }

  if (value) {
    const subscription = await subscriptionService.getEffectiveStatus(restaurantId);
    if (!subscription.features.includes(key)) {
      throw AppError.forbidden(`The current plan does not include the "${key}" feature.`);
    }
  }

  const flagDoc = await featureFlagRepository.setFlag(restaurantId, key, value);
  log.info('Feature flag updated', { restaurantId, key, value });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.FEATURE_FLAG_UPDATED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { key, value },
  });
  return Object.fromEntries(flagDoc.flags);
}

module.exports = { getFlagsForRestaurant, setFlag };
