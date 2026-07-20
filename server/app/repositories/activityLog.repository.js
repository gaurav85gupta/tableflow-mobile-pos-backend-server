// server/app/repositories/activityLog.repository.js
//
// C.9 Activity Logs. Deliberately exposes ONLY `create` and read/list
// functions -- no update, no delete -- so immutability is enforced by what
// code exists, not by a runtime check.

const ActivityLog = require('../models/activityLog.model');

async function create(entry) {
  return ActivityLog.create(entry);
}

async function list({ restaurantId, action, skip = 0, limit = 50 } = {}) {
  const query = {};
  if (restaurantId) query.restaurantId = restaurantId;
  if (action) query.action = action;

  const [items, total] = await Promise.all([
    ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(query),
  ]);
  return { items, total };
}

async function listRecent(limit = 10) {
  return ActivityLog.find({}).sort({ createdAt: -1 }).limit(limit);
}

module.exports = { create, list, listRecent };
