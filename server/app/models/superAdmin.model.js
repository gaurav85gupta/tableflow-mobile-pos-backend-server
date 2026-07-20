// server/app/models/superAdmin.model.js
//
// C.1 Super Admin Authentication.
// Deliberately a SEPARATE collection from `User` (restaurant-scoped
// owner/manager/cashier accounts) — a Super Admin is not scoped to any
// restaurant and must never be reachable via a restaurantId-scoped query by
// construction, not just by convention. This is the same reasoning as B.6:
// keep tenant-scoped and platform-level identities structurally incapable
// of being confused with each other.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_SALT_ROUNDS = 12;

const superAdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

superAdminSchema.pre('save', async function hashPasswordIfChanged(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, BCRYPT_SALT_ROUNDS);
  next();
});

superAdminSchema.methods.comparePassword = function comparePassword(plainTextPassword) {
  return bcrypt.compare(plainTextPassword, this.passwordHash);
};

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
