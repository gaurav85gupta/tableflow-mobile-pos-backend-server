// server/app/services/restaurant.service.js
//
// B.7 Restaurant Management / C.3 Restaurant Management (Super Admin
// Platform). Super Admin-only operations on restaurant lifecycle. Also owns
// default-provisioning: creating a restaurant creates its trial
// Subscription, default FeatureFlag document, AND default RestaurantConfig
// (C.4) in the same operation, so no restaurant can exist in a
// half-set-up state that the Android app's first sync would choke on.
//
// C.3 note: "Restaurant delete physically nahi hoga" -- there is
// deliberately no `deleteRestaurant` function anywhere in this file, and no
// DELETE route exists for restaurants. archiveRestaurant() is the only
// "removal" path, and it's a soft status change, not a document deletion.

const restaurantRepository = require('../repositories/restaurant.repository');
const subscriptionRepository = require('../repositories/subscription.repository');
const featureFlagRepository = require('../repositories/featureFlag.repository');
const restaurantConfigRepository = require('../repositories/restaurantConfig.repository');
const activityLogService = require('./activityLog.service');
const AppError = require('../utils/AppError');
const { RESTAURANT_STATUS, SUBSCRIPTION_STATUS, ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.GENERAL);
const DEFAULT_TRIAL_DAYS = 14;

function generateRestaurantCode() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TF-${random}`;
}

async function createRestaurant(input, actor) {
  const { name, ownerName, contactEmail, contactPhone, address, gstNumber, plan, timezone, currency } = input;

  let restaurantCode = generateRestaurantCode();
  while (await restaurantRepository.findByCode(restaurantCode)) {
    restaurantCode = generateRestaurantCode();
  }

  const restaurant = await restaurantRepository.create({
    name,
    ownerName,
    restaurantCode,
    contactEmail,
    contactPhone,
    address,
    gstNumber: gstNumber || null,
    timezone,
    currency,
    plan: plan || 'trial',
    status: RESTAURANT_STATUS.ACTIVE,
  });

  const trialExpiresAt = new Date(Date.now() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await subscriptionRepository.create({
    restaurantId: restaurant.id,
    plan: plan || 'trial',
    status: SUBSCRIPTION_STATUS.TRIAL,
    expiresAt: trialExpiresAt,
  });
  await featureFlagRepository.createDefault(restaurant.id);
  await restaurantConfigRepository.createDefault(restaurant.id); // C.4

  log.info('Restaurant created', { restaurantId: restaurant.id, restaurantCode });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.RESTAURANT_CREATED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId: restaurant.id,
    details: { name, restaurantCode },
  });

  return restaurant;
}

async function getRestaurantById(restaurantId) {
  const restaurant = await restaurantRepository.findById(restaurantId);
  if (!restaurant) throw AppError.notFound('Restaurant not found.');
  return restaurant;
}

/** C.10 Search & Filters -- search/filter/sort all pushed down to the repository query, not done in memory. */
async function listRestaurants(query) {
  return restaurantRepository.list(query);
}

/** C.3 Restaurant Actions -- Edit. Archived restaurants cannot be edited (must be reactivated first). */
async function updateRestaurant(restaurantId, updates, actor) {
  const existing = await restaurantRepository.findById(restaurantId);
  if (!existing) throw AppError.notFound('Restaurant not found.');
  if (existing.status === RESTAURANT_STATUS.ARCHIVED) {
    throw AppError.badRequest('Cannot edit an archived restaurant. Reactivate it first.');
  }

  const restaurant = await restaurantRepository.update(restaurantId, updates);
  log.info('Restaurant updated', { restaurantId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.RESTAURANT_UPDATED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { updatedFields: Object.keys(updates) },
  });
  return restaurant;
}

async function activateRestaurant(restaurantId, actor) {
  const restaurant = await restaurantRepository.updateStatus(restaurantId, RESTAURANT_STATUS.ACTIVE);
  if (!restaurant) throw AppError.notFound('Restaurant not found.');
  log.info('Restaurant activated', { restaurantId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.RESTAURANT_ACTIVATED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
  });
  return restaurant;
}

async function suspendRestaurant(restaurantId, actor) {
  const restaurant = await restaurantRepository.updateStatus(restaurantId, RESTAURANT_STATUS.SUSPENDED);
  if (!restaurant) throw AppError.notFound('Restaurant not found.');
  log.info('Restaurant suspended', { restaurantId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.RESTAURANT_SUSPENDED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
  });
  return restaurant;
}

async function archiveRestaurant(restaurantId, actor) {
  const restaurant = await restaurantRepository.updateStatus(restaurantId, RESTAURANT_STATUS.ARCHIVED);
  if (!restaurant) throw AppError.notFound('Restaurant not found.');
  log.info('Restaurant archived', { restaurantId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.RESTAURANT_ARCHIVED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
  });
  return restaurant;
}

/**
 * B.6 Multi-Tenant Foundation.
 * The ONLY function in the codebase allowed to establish "this request
 * belongs to this restaurant." Called by middleware/tenant.middleware.js
 * right after JWT verification -- never trusts a restaurantId the client
 * sends in a body/query/param, only the one embedded in the verified token.
 */
async function assertRestaurantActiveOrThrow(restaurantId) {
  const restaurant = await restaurantRepository.findById(restaurantId);
  if (!restaurant) throw AppError.tenantMismatch('Restaurant no longer exists.');
  if (restaurant.status !== RESTAURANT_STATUS.ACTIVE) {
    throw new AppError('This restaurant account is not active.', { statusCode: 403, code: 'RESTAURANT_INACTIVE' });
  }
  return restaurant;
}

module.exports = {
  createRestaurant,
  getRestaurantById,
  listRestaurants,
  updateRestaurant,
  activateRestaurant,
  suspendRestaurant,
  archiveRestaurant,
  assertRestaurantActiveOrThrow,
};
