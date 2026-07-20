// server/app/services/authentication.service.js
//
// B.5 Authentication Foundation.
// Flow implemented here exactly as specified:
//   Restaurant ID -> User Login -> JWT Access Token -> Refresh Token -> Authenticated APIs
//
// C.1 Super Admin Authentication extends this with a parallel, structurally
// separate login path (`superAdminLogin`) against the SuperAdmin collection
// -- it never touches Restaurant/User at all, so a Super Admin token can
// never be confused with a restaurant-scoped one (see models/superAdmin.model.js).
//
// Controllers never touch bcrypt, jwt, or the repositories directly -- they
// call these functions only. This is the "Domain Services" pattern.

const restaurantRepository = require('../repositories/restaurant.repository');
const userRepository = require('../repositories/user.repository');
const deviceRepository = require('../repositories/device.repository');
const sessionRepository = require('../repositories/session.repository');
const superAdminRepository = require('../repositories/superAdmin.repository');
const tokenService = require('./token.service');
const activityLogService = require('./activityLog.service');
const AppError = require('../utils/AppError');
const { RESTAURANT_STATUS, DEVICE_STATUS, ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.AUTH);

/**
 * Step 1-3 of the flow: resolve restaurant by code, verify user credentials
 * within that restaurant's scope, register/refresh the device, issue tokens.
 */
async function login({ restaurantCode, username, password, deviceIdentifier, deviceName, userAgent, ipAddress }) {
  const restaurant = await restaurantRepository.findByCode(restaurantCode);
  if (!restaurant) {
    log.warn('Login failed: unknown restaurant code', { restaurantCode });
    throw AppError.invalidCredentials();
  }
  if (restaurant.status !== RESTAURANT_STATUS.ACTIVE) {
    log.warn('Login blocked: restaurant not active', { restaurantId: restaurant.id, status: restaurant.status });
    throw new AppError('This restaurant account is not active. Contact support.', { statusCode: 403, code: 'RESTAURANT_INACTIVE' });
  }

  const user = await userRepository.findByUsernameWithPassword(restaurant.id, username);
  if (!user || !user.isActive) {
    log.warn('Login failed: unknown or inactive user', { restaurantId: restaurant.id, username });
    await activityLogService.record({
      action: ACTIVITY_ACTIONS.LOGIN_FAILED,
      actorType: 'system',
      restaurantId: restaurant.id,
      details: { reason: 'unknown_or_inactive_user', username },
      ipAddress,
    });
    throw AppError.invalidCredentials();
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    log.warn('Login failed: bad password', { restaurantId: restaurant.id, userId: user.id });
    await activityLogService.record({
      action: ACTIVITY_ACTIONS.LOGIN_FAILED,
      actorType: 'user',
      actorId: user.id,
      actorLabel: user.name,
      restaurantId: restaurant.id,
      details: { reason: 'bad_password' },
      ipAddress,
    });
    throw AppError.invalidCredentials();
  }

  const existingDevice = await deviceRepository.findByIdentifier(restaurant.id, deviceIdentifier);
  if (existingDevice && (existingDevice.status === DEVICE_STATUS.INACTIVE || existingDevice.status === DEVICE_STATUS.REMOVED)) {
    log.warn('Login blocked: device disabled', { restaurantId: restaurant.id, deviceIdentifier, status: existingDevice.status });
    throw new AppError('This device has been disabled. Contact your administrator.', { statusCode: 403, code: 'DEVICE_DISABLED' });
  }

  const device = await deviceRepository.upsertByIdentifier(restaurant.id, deviceIdentifier, {
    deviceName,
    registeredByUserId: user.id,
  });

  if (!existingDevice) {
    await activityLogService.record({
      action: ACTIVITY_ACTIONS.DEVICE_REGISTERED,
      actorType: 'user',
      actorId: user.id,
      actorLabel: user.name,
      restaurantId: restaurant.id,
      details: { deviceId: device.id, deviceName },
      ipAddress,
    });
  }

  const accessToken = tokenService.signAccessToken({
    userId: user.id,
    restaurantId: restaurant.id,
    deviceId: device.id,
    role: user.role,
  });
  const refreshToken = tokenService.generateRefreshToken();

  await sessionRepository.create({
    restaurantId: restaurant.id,
    userId: user.id,
    deviceId: device.id,
    refreshToken,
    expiresAt: tokenService.refreshTokenExpiryDate(),
    userAgent,
    ipAddress,
  });

  log.info('Login success', { restaurantId: restaurant.id, userId: user.id, deviceId: device.id });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, role: user.role },
    restaurant: { id: restaurant.id, name: restaurant.name, code: restaurant.restaurantCode },
    device: { id: device.id, name: device.deviceName, status: device.status },
  };
}

/**
 * Step 4 of the flow: exchange a valid refresh token for a new access token.
 * Branches on whether the session is restaurant-scoped or a Super Admin
 * session (session.restaurantId is null for the latter, see
 * models/session.model.js) since the two identities live in entirely
 * different collections.
 */
async function refreshAccessToken(refreshToken) {
  const session = await sessionRepository.findValidByToken(refreshToken);
  if (!session) {
    log.warn('Refresh failed: token invalid, expired, or revoked');
    throw AppError.unauthorized('Session expired. Please log in again.');
  }

  if (session.restaurantId) {
    const user = await userRepository.findById(session.userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Session expired. Please log in again.');
    }
    const accessToken = tokenService.signAccessToken({
      userId: user.id,
      restaurantId: session.restaurantId,
      deviceId: session.deviceId,
      role: user.role,
    });
    return { accessToken };
  }

  const admin = await superAdminRepository.findById(session.userId);
  if (!admin || !admin.isActive) {
    throw AppError.unauthorized('Session expired. Please log in again.');
  }
  const accessToken = tokenService.signAccessToken({
    userId: admin.id,
    restaurantId: null,
    deviceId: null,
    role: 'super_admin',
  });
  return { accessToken };
}

async function logout(refreshToken) {
  const session = await sessionRepository.findValidByToken(refreshToken);
  if (session) {
    await sessionRepository.revoke(session.id);
    log.info('Logout success', { userId: session.userId, deviceId: session.deviceId });
  }
}

/**
 * C.1 Super Admin Authentication.
 * A separate, parallel flow: no restaurantCode, no device registration, no
 * multi-tenant concept at all -- a Super Admin operates across every
 * restaurant, so there's nothing to scope. Token payload carries
 * `role: 'super_admin'` and no `restaurantId`, which is exactly why
 * tenant.middleware.js's resolveTenant would reject it if a Super Admin
 * token were ever sent to a restaurant-scoped route (no restaurantId to
 * resolve) -- the two token types are structurally incompatible with each
 * other's routes, not just conventionally kept apart.
 */
async function superAdminLogin({ email, password, ipAddress }) {
  const admin = await superAdminRepository.findByEmailWithPassword(email);
  if (!admin || !admin.isActive) {
    await activityLogService.record({
      action: ACTIVITY_ACTIONS.SUPER_ADMIN_LOGIN_FAILED,
      actorType: 'system',
      details: { reason: 'unknown_or_inactive_admin', email },
      ipAddress,
    });
    throw AppError.invalidCredentials();
  }

  const passwordMatches = await admin.comparePassword(password);
  if (!passwordMatches) {
    await activityLogService.record({
      action: ACTIVITY_ACTIONS.SUPER_ADMIN_LOGIN_FAILED,
      actorType: 'super_admin',
      actorId: admin.id,
      actorLabel: admin.name,
      details: { reason: 'bad_password' },
      ipAddress,
    });
    throw AppError.invalidCredentials();
  }

  const accessToken = tokenService.signAccessToken({
    userId: admin.id,
    restaurantId: null,
    deviceId: null,
    role: 'super_admin',
  });
  const refreshToken = tokenService.generateRefreshToken();

  await sessionRepository.create({
    restaurantId: null,
    userId: admin.id,
    deviceId: null,
    refreshToken,
    expiresAt: tokenService.refreshTokenExpiryDate(),
    ipAddress,
  });

  await activityLogService.record({
    action: ACTIVITY_ACTIONS.SUPER_ADMIN_LOGIN,
    actorType: 'super_admin',
    actorId: admin.id,
    actorLabel: admin.name,
    ipAddress,
  });

  return {
    accessToken,
    refreshToken,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  };
}

/** C.1 Super Admin Authentication -- Password Change. */
async function changeSuperAdminPassword(adminId, { currentPassword, newPassword }) {
  const admin = await superAdminRepository.findByIdWithPassword(adminId);
  if (!admin) throw AppError.notFound('Admin account not found.');

  const currentMatches = await admin.comparePassword(currentPassword);
  if (!currentMatches) {
    throw AppError.badRequest('Current password is incorrect.');
  }

  admin.passwordHash = newPassword; // re-hashed by the pre-save hook
  await admin.save();

  await activityLogService.record({
    action: ACTIVITY_ACTIONS.SUPER_ADMIN_PASSWORD_CHANGED,
    actorType: 'super_admin',
    actorId: admin.id,
    actorLabel: admin.name,
  });

  log.info('Super admin password changed', { adminId: admin.id });
}

module.exports = { login, refreshAccessToken, logout, superAdminLogin, changeSuperAdminPassword };
