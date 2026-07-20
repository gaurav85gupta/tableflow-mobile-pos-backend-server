// server/app/repositories/subscription.repository.js

const Subscription = require('../models/subscription.model');
const { SUBSCRIPTION_STATUS } = require('../config/constants');

async function create(data) {
  return Subscription.create(data);
}

async function findByRestaurant(restaurantId) {
  return Subscription.findOne({ restaurantId });
}

async function update(restaurantId, data) {
  return Subscription.findOneAndUpdate({ restaurantId }, data, { new: true });
}

/** C.2 Dashboard Widgets -- Active Subscriptions count. */
async function countActive() {
  return Subscription.countDocuments({ status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] } });
}

/** C.2 Dashboard Widgets -- Expiring Subscriptions (within the given number of days). */
async function findExpiringSoon(withinDays = 7) {
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  return Subscription.find({
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.GRACE_PERIOD] },
    expiresAt: { $lte: cutoff, $gte: new Date() },
  }).populate('restaurantId', 'name restaurantCode');
}

async function findAllExpiredOrActive(statusList) {
  return Subscription.find({ status: { $in: statusList } });
}

module.exports = { create, findByRestaurant, update, countActive, findExpiringSoon, findAllExpiredOrActive };
