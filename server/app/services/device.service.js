// server/app/services/device.service.js
//
// B.9 Device Management Foundation / C.8 Device Management. First
// registration happens implicitly during login (authentication.service.js
// upserts the device as PENDING) -- this service covers explicit
// management: approve/disable/remove, both restaurant-scoped (the
// restaurant's own owner/manager) and cross-restaurant (Super Admin,
// via the `*AnyRestaurant` repository functions).

const deviceRepository = require('../repositories/device.repository');
const activityLogService = require('./activityLog.service');
const AppError = require('../utils/AppError');
const { DEVICE_STATUS, ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.GENERAL);

async function listDevices(restaurantId, pagination) {
  return deviceRepository.findByRestaurant(restaurantId, pagination);
}

/** C.8 -- Super Admin device list across all (or one filtered) restaurant. */
async function listAllDevices(filters) {
  return deviceRepository.listAll(filters);
}

async function getDeviceById(restaurantId, deviceId) {
  const device = await deviceRepository.findById(restaurantId, deviceId);
  if (!device) throw AppError.notFound('Device not found.');
  return device;
}

async function deactivateDevice(restaurantId, deviceId) {
  const device = await deviceRepository.setStatus(restaurantId, deviceId, DEVICE_STATUS.INACTIVE);
  if (!device) throw AppError.notFound('Device not found.');
  log.info('Device deactivated', { restaurantId, deviceId });
  return device;
}

async function reactivateDevice(restaurantId, deviceId) {
  const device = await deviceRepository.setStatus(restaurantId, deviceId, DEVICE_STATUS.ACTIVE);
  if (!device) throw AppError.notFound('Device not found.');
  log.info('Device reactivated', { restaurantId, deviceId });
  return device;
}

/** C.8 Actions -- Approve (Super Admin only, cross-restaurant). */
async function approveDevice(deviceId, actor) {
  const device = await deviceRepository.setStatusAnyRestaurant(deviceId, DEVICE_STATUS.ACTIVE);
  if (!device) throw AppError.notFound('Device not found.');
  log.info('Device approved', { deviceId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.DEVICE_APPROVED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId: device.restaurantId,
    details: { deviceId, deviceName: device.deviceName },
  });
  return device;
}

/** C.8 Actions -- Disable (Super Admin only, cross-restaurant). */
async function disableDevice(deviceId, actor) {
  const device = await deviceRepository.setStatusAnyRestaurant(deviceId, DEVICE_STATUS.INACTIVE);
  if (!device) throw AppError.notFound('Device not found.');
  log.info('Device disabled', { deviceId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.DEVICE_DISABLED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId: device.restaurantId,
    details: { deviceId, deviceName: device.deviceName },
  });
  return device;
}

/**
 * C.8 Actions -- Remove. Per C.3's precedent ("Restaurant delete physically
 * nahi hoga"), device removal is ALSO a soft status change (REMOVED), not a
 * document deletion -- a removed device's history (which user/restaurant it
 * belonged to) stays available for the activity log / audit trail to
 * reference.
 */
async function removeDevice(deviceId, actor) {
  const device = await deviceRepository.setStatusAnyRestaurant(deviceId, DEVICE_STATUS.REMOVED);
  if (!device) throw AppError.notFound('Device not found.');
  log.info('Device removed', { deviceId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.DEVICE_REMOVED,
    actorType: 'super_admin',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId: device.restaurantId,
    details: { deviceId, deviceName: device.deviceName },
  });
  return device;
}

/** Called by tenant middleware on every authenticated request -- cheap, fire-and-forget. */
async function touchLastSeen(deviceId) {
  return deviceRepository.touchLastSeen(deviceId);
}

module.exports = {
  listDevices,
  listAllDevices,
  getDeviceById,
  deactivateDevice,
  reactivateDevice,
  approveDevice,
  disableDevice,
  removeDevice,
  touchLastSeen,
};
