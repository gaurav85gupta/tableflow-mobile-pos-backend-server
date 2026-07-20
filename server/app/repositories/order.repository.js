// server/app/repositories/order.repository.js
//
// B.2 -- pure Mongoose data access. Order documents embed items/payments
// (see order.model.js's doc comment on why), so most "business logic"
// here is really just whole-document reads/writes; the actual bill math
// lives in services/billCalculation.service.js and order-state transition
// rules live in services/order.service.js.

const Order = require('../models/order.model');

async function create(data) {
  return Order.create(data);
}

async function findById(restaurantId, orderId) {
  return Order.findOne({ _id: orderId, restaurantId });
}

async function getNextDisplayNumber(restaurantId) {
  const last = await Order.findOne({ restaurantId }).sort({ displayNumber: -1 }).select('displayNumber');
  return (last?.displayNumber || 0) + 1;
}

/** H.12 Hold Order -- orders currently on hold, for a future "resume" list UI. */
async function listHeld(restaurantId) {
  return Order.find({ restaurantId, status: 'hold' }).sort({ updatedAt: -1 });
}

async function listForRestaurant(restaurantId, { status, skip = 0, limit = 50 } = {}) {
  const query = { restaurantId };
  if (status) query.status = status;
  const [items, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(query),
  ]);
  return { items, total };
}

async function update(restaurantId, orderId, updates) {
  return Order.findOneAndUpdate(
    { _id: orderId, restaurantId },
    { $set: updates, $inc: { version: 1 } },
    { new: true, runValidators: true },
  );
}

/** E.6 Incremental Sync. */
async function findChangedSince(restaurantId, since) {
  return Order.find({ restaurantId, updatedAt: { $gt: new Date(since) } }).sort({ updatedAt: 1 });
}

/** H.13 Dashboard Integration -- today's paid-order totals, the simplest possible real dashboard number. */
async function getTodayStats(restaurantId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await Order.aggregate([
    { $match: { restaurantId: new (require('mongoose').Types.ObjectId)(restaurantId), status: 'paid', paidAt: { $gte: startOfDay } } },
    { $group: { _id: null, totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$grandTotal' } } },
  ]);

  return result[0] || { totalOrders: 0, totalRevenue: 0 };
}

module.exports = { create, findById, getNextDisplayNumber, listHeld, listForRestaurant, update, findChangedSince, getTodayStats };
