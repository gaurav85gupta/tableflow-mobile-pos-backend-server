// server/app/models/subscription.model.js
//
// B.3 Database Foundation / B.10 Subscription Foundation.
// Payment gateway integration is explicitly out of scope for this phase —
// `features` here is the *entitlement* list a plan grants; whether an
// individual feature is actually switched on for the restaurant is decided
// by featureFlag.model.js, which can turn OFF something the plan allows but
// can never turn ON something the plan doesn't include (enforced in
// services/subscription.service.js and services/featureFlag.service.js).

const mongoose = require('mongoose');
const { SUBSCRIPTION_STATUS, FEATURE_KEYS } = require('../config/constants');

const subscriptionSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true, index: true },

    plan: { type: String, required: true, default: 'trial' },
    status: { type: String, enum: Object.values(SUBSCRIPTION_STATUS), default: SUBSCRIPTION_STATUS.TRIAL },

    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },

    /** Features this plan entitles the restaurant to, independent of per-restaurant on/off toggles. */
    features: {
      type: [String],
      enum: Object.values(FEATURE_KEYS),
      default: Object.values(FEATURE_KEYS),
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
