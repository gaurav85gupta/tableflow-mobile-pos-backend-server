// server/app/repositories/restaurantConfig.repository.js
//
// C.4 Restaurant Configuration.

const RestaurantConfig = require('../models/restaurantConfig.model');

async function createDefault(restaurantId) {
  return RestaurantConfig.create({ restaurantId });
}

async function findByRestaurant(restaurantId) {
  return RestaurantConfig.findOne({ restaurantId });
}

async function update(restaurantId, updates) {
  return RestaurantConfig.findOneAndUpdate({ restaurantId }, updates, { new: true, upsert: true });
}

module.exports = { createDefault, findByRestaurant, update };
