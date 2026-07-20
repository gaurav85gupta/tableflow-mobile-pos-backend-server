// server/app/models/user.model.js
//
// B.3 Database Foundation / B.8 User Management Foundation.
// Password hashing lives on the model (via a pre-save hook + instance
// method) rather than in the service, so it's impossible for any code path
// to accidentally save a plaintext password — this is a deliberate defense
// in depth choice for B.16 Security Foundation.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../config/constants');

const BCRYPT_SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },

    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: Object.values(USER_ROLES), default: USER_ROLES.CASHIER },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// A username only needs to be unique WITHIN a restaurant, not globally —
// two different restaurants can both have a "manager" login. This is the
// multi-tenant scoping rule (B.6) applied at the schema/index level.
userSchema.index({ restaurantId: 1, username: 1 }, { unique: true });

userSchema.pre('save', async function hashPasswordIfChanged(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, BCRYPT_SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plainTextPassword) {
  return bcrypt.compare(plainTextPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
