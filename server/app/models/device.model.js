// server/app/models/device.model.js
//
// B.3 Database Foundation / B.9 Device Management Foundation.
// Mirrors the Android app's DeviceId concept (common.multitenant.DeviceId).
// `lastSeenAt` is updated by the tenant-resolution middleware on every
// authenticated request (cheap, no extra round trip from the client) so
// "last seen" stays accurate without a dedicated heartbeat endpoint.

const mongoose = require('mongoose');
const { DEVICE_STATUS } = require('../config/constants');

const deviceSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },

    /** Stable client-generated identifier (e.g. Android ID / installation UUID), not the Mongo _id. */
    deviceIdentifier: { type: String, required: true },

    deviceName: { type: String, trim: true, default: 'Unnamed device' },
    platform: { type: String, enum: ['android', 'web'], default: 'android' },

    /**
     * C.8 Device Management — new devices start PENDING and need explicit
     * Super Admin approval before they can be trusted. NOTE: this means
     * authentication.service.js's login flow must NOT block on device
     * status (a brand new device must still be able to log in and sync)
     * but the Super Admin dashboard surfaces PENDING devices for review.
     */
    status: { type: String, enum: Object.values(DEVICE_STATUS), default: DEVICE_STATUS.PENDING },
    lastSeenAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now },

    registeredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

deviceSchema.index({ restaurantId: 1, deviceIdentifier: 1 }, { unique: true });

module.exports = mongoose.model('Device', deviceSchema);
