// server/app/models/session.model.js
//
// B.3 Database Foundation / B.5 Authentication Foundation.
// A session document is created per successful login (per device) and
// tracks the refresh token lifecycle. Access tokens are short-lived and
// stateless (JWT, never stored); refresh tokens ARE stored (hashed) so they
// can be revoked individually — logging out one device must not invalidate
// every other device's session.

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    // Nullable: a Super Admin session (C.1) has no restaurant or device
    // context at all -- it operates across every restaurant, not scoped to
    // one. Restaurant-scoped (owner/manager/cashier) sessions always set both.
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // ref varies: User or SuperAdmin
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },

    /** SHA-256 hash of the refresh token — never store the raw token, same principle as password hashing. */
    refreshTokenHash: { type: String, required: true, select: false },

    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }, // Mongo TTL index auto-cleans expired sessions
    revokedAt: { type: Date, default: null },

    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true },
);

sessionSchema.methods.isValid = function isValid() {
  return !this.revokedAt && this.expiresAt > new Date();
};

module.exports = mongoose.model('Session', sessionSchema);
