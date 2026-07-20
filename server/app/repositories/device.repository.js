// server/app/repositories/device.repository.js

const Device = require('../models/device.model');
const { DEVICE_STATUS } = require('../config/constants');

/**
 * Registers a device on login without ever silently overwriting a Super
 * Admin's approve/disable/remove decision (C.8). `status` is intentionally
 * NOT in the `$set` -- it only appears in `$setOnInsert`, so it's set once
 * (to PENDING, per the schema default) when the device is first seen, and
 * never touched again by the login path. Status changes only ever happen
 * through `setStatus`, called from the Super Admin device-management
 * endpoints.
 */
async function upsertByIdentifier(restaurantId, deviceIdentifier, { deviceName, registeredByUserId }) {
  const now = new Date();
  return Device.findOneAndUpdate(
    { restaurantId, deviceIdentifier },
    {
      $set: { deviceName, lastSeenAt: now, lastLoginAt: now, registeredByUserId },
      $setOnInsert: { restaurantId, deviceIdentifier, status: DEVICE_STATUS.PENDING },
    },
    { new: true, upsert: true },
  );
}

async function findByIdentifier(restaurantId, deviceIdentifier) {
  return Device.findOne({ restaurantId, deviceIdentifier });
}

async function touchLastSeen(deviceMongoId) {
  return Device.findByIdAndUpdate(deviceMongoId, { lastSeenAt: new Date() });
}

async function findByRestaurant(restaurantId, { skip = 0, limit = 25 } = {}) {
  const query = { restaurantId };
  const [items, total] = await Promise.all([
    Device.find(query).sort({ lastSeenAt: -1 }).skip(skip).limit(limit),
    Device.countDocuments(query),
  ]);
  return { items, total };
}

/** C.8 -- across ALL restaurants, for the Super Admin device management screen. */
async function listAll({ status, restaurantId, skip = 0, limit = 25 } = {}) {
  const query = {};
  if (status) query.status = status;
  if (restaurantId) query.restaurantId = restaurantId;
  const [items, total] = await Promise.all([
    Device.find(query).populate('restaurantId', 'name restaurantCode').sort({ lastSeenAt: -1 }).skip(skip).limit(limit),
    Device.countDocuments(query),
  ]);
  return { items, total };
}

async function findById(restaurantId, deviceMongoId) {
  return Device.findOne({ _id: deviceMongoId, restaurantId });
}

async function findByIdAnyRestaurant(deviceMongoId) {
  return Device.findById(deviceMongoId);
}

async function setStatus(restaurantId, deviceMongoId, status) {
  return Device.findOneAndUpdate({ _id: deviceMongoId, restaurantId }, { status }, { new: true });
}

async function setStatusAnyRestaurant(deviceMongoId, status) {
  return Device.findByIdAndUpdate(deviceMongoId, { status }, { new: true });
}

/** C.2 Dashboard Widgets -- total device count across the platform. */
async function countAll() {
  return Device.countDocuments({});
}

module.exports = {
  upsertByIdentifier,
  findByIdentifier,
  touchLastSeen,
  findByRestaurant,
  listAll,
  findById,
  findByIdAnyRestaurant,
  setStatus,
  setStatusAnyRestaurant,
  countAll,
};
