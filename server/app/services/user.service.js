// server/app/services/user.service.js
//
// B.8 User Management Foundation / C.7 User Management. Every function
// takes an explicit restaurantId (resolved by tenant middleware from the
// verified JWT for restaurant-scoped callers, or supplied via a path param
// for Super Admin callers -- see restaurant.controller.js's sibling
// user-management routes) and passes it straight through to the
// repository, so it's structurally impossible for one restaurant's service
// call to touch another restaurant's users.

const userRepository = require('../repositories/user.repository');
const activityLogService = require('./activityLog.service');
const AppError = require('../utils/AppError');
const { ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.GENERAL);

async function createUser(restaurantId, { name, username, password, role }, actor) {
  const existing = await userRepository.findByUsernameWithPassword(restaurantId, username);
  if (existing) {
    throw AppError.conflict('A user with this username already exists for this restaurant.');
  }

  // passwordHash field receives the PLAIN password here; the model's
  // pre-save hook hashes it -- see models/user.model.js.
  const user = await userRepository.create({ restaurantId, name, username, passwordHash: password, role });
  log.info('User created', { restaurantId, userId: user.id, role });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.USER_CREATED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { newUserId: user.id, username, role },
  });
  return user;
}

async function listUsers(restaurantId, pagination) {
  return userRepository.findByRestaurant(restaurantId, pagination);
}

async function getUserById(restaurantId, userId) {
  const user = await userRepository.findById(userId);
  if (!user || String(user.restaurantId) !== String(restaurantId)) {
    throw AppError.tenantMismatch();
  }
  return user;
}

/** C.7 -- Super Admin (or an owner/manager) edits a user's name/role. */
async function updateUser(restaurantId, userId, updates, actor) {
  const user = await userRepository.update(restaurantId, userId, updates);
  if (!user) throw AppError.notFound('User not found.');
  log.info('User updated', { restaurantId, userId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.USER_UPDATED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { targetUserId: userId, updatedFields: Object.keys(updates) },
  });
  return user;
}

async function deactivateUser(restaurantId, userId, actor) {
  const user = await userRepository.setActive(restaurantId, userId, false);
  if (!user) throw AppError.notFound('User not found.');
  log.info('User deactivated', { restaurantId, userId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.USER_DISABLED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { targetUserId: userId },
  });
  return user;
}

async function reactivateUser(restaurantId, userId, actor) {
  const user = await userRepository.setActive(restaurantId, userId, true);
  if (!user) throw AppError.notFound('User not found.');
  log.info('User reactivated', { restaurantId, userId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.USER_ENABLED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { targetUserId: userId },
  });
  return user;
}

module.exports = { createUser, listUsers, getUserById, updateUser, deactivateUser, reactivateUser };
