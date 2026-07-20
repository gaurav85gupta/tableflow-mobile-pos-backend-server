// server/app/repositories/featureFlag.repository.js

const FeatureFlag = require('../models/featureFlag.model');

async function findByRestaurant(restaurantId) {
  return FeatureFlag.findOne({ restaurantId });
}

async function createDefault(restaurantId) {
  return FeatureFlag.create({ restaurantId });
}

async function setFlag(restaurantId, key, value) {
  return FeatureFlag.findOneAndUpdate(
    { restaurantId },
    { $set: { [`flags.${key}`]: value } },
    { new: true, upsert: true },
  );
}

module.exports = { findByRestaurant, createDefault, setFlag };
