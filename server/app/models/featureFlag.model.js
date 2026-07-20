// server/app/models/featureFlag.model.js
//
// B.3 Database Foundation / B.11 Feature Flag Foundation.
// One document per restaurant holding an on/off map for every known feature
// key. Deliberately NOT one-document-per-flag: the Android app fetches all
// of a restaurant's flags in a single read right after login (see
// B.11 "Android app login ke baad feature configuration receive karegi"),
// so a single document avoids N reads for N features.

const mongoose = require('mongoose');
const { FEATURE_KEYS } = require('../config/constants');

function defaultFlags() {
  const flags = {};
  Object.values(FEATURE_KEYS).forEach((key) => {
    flags[key] = true;
  });
  return flags;
}

const featureFlagSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true, index: true },

    /** e.g. { counter: true, dashboard: true, intelligence: false, printing: true, kot: true } */
    flags: {
      type: Map,
      of: Boolean,
      default: defaultFlags,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);
