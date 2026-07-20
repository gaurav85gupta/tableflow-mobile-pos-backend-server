// server/app/services/restaurantConfig.service.js
//
// C.4 Restaurant Configuration -- "Ye Android app ke first sync mein
// download hoga." Read is used by the Android app itself (restaurant-scoped
// route); update is Super Admin-only for now (no owner-facing settings UI
// in this phase).

const restaurantConfigRepository = require('../repositories/restaurantConfig.repository');
const AppError = require('../utils/AppError');

async function getConfig(restaurantId) {
  const config = await restaurantConfigRepository.findByRestaurant(restaurantId);
  if (!config) throw AppError.notFound('Configuration not found for this restaurant.');
  return config;
}

async function updateConfig(restaurantId, updates) {
  return restaurantConfigRepository.update(restaurantId, updates);
}

module.exports = { getConfig, updateConfig };
