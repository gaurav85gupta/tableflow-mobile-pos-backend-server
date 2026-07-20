// server/app/models/restaurant.model.js
//
// B.3 Database Foundation / B.7 Restaurant Management.
// C.3 Restaurant Management extends this with owner/GST/timezone/currency
// and a platform-internal UUID separate from Mongo's _id and from the
// human-facing restaurantCode -- three distinct identifiers, three distinct
// purposes:
//   _id            -> internal DB reference, used in every foreign key
//   restaurantCode -> what a human types at login (e.g. "TF-4821")
//   internalUuid   -> stable external identifier safe to expose to
//                     third-party integrations later without leaking the
//                     Mongo _id format or the login code
//
// The root tenant record. Every other collection (users, devices,
// subscriptions, featureFlags) references restaurantId and is meaningless
// without it -- see B.6 Multi-Tenant Foundation for how that's enforced.

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { RESTAURANT_STATUS } = require('../config/constants');

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    /** Short, human-typeable code used at login (e.g. "TF-4821") -- never the raw ObjectId. */
    restaurantCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },

    /** Stable external identifier, generated once, never reused even if a restaurant is archived. */
    internalUuid: { type: String, required: true, unique: true, default: randomUUID },

    ownerName: { type: String, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },

    /** GST/tax registration number -- optional per C.3, format not validated here (varies by country/region). */
    gstNumber: { type: String, trim: true, default: null },

    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },

    plan: { type: String, default: 'trial' }, // kept loose here on purpose; see subscription.model.js for the source of truth on plan/expiry
    status: {
      type: String,
      enum: Object.values(RESTAURANT_STATUS),
      default: RESTAURANT_STATUS.ACTIVE,
      index: true,
    },
  },
  { timestamps: true },
);

restaurantSchema.index({ name: 'text', contactEmail: 'text', restaurantCode: 'text' }); // C.10 Search

module.exports = mongoose.model('Restaurant', restaurantSchema);
