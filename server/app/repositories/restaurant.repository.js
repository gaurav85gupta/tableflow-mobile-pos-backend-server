// server/app/repositories/restaurant.repository.js
//
// B.2 -- Repositories are the ONLY files that talk to Mongoose models
// directly.

const Restaurant = require('../models/restaurant.model');

async function create(data) {
  return Restaurant.create(data);
}

async function findById(restaurantId) {
  return Restaurant.findById(restaurantId);
}

async function findByCode(restaurantCode) {
  return Restaurant.findOne({ restaurantCode: restaurantCode.toUpperCase() });
}

/** C.3 Restaurant Actions -- Edit. Whitelisted fields only -- status/restaurantCode/internalUuid are never editable through this path. */
async function update(restaurantId, updates) {
  const allowedFields = ['name', 'ownerName', 'contactEmail', 'contactPhone', 'address', 'gstNumber', 'plan', 'timezone', 'currency'];
  const safeUpdates = {};
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) safeUpdates[field] = updates[field];
  });
  return Restaurant.findByIdAndUpdate(restaurantId, safeUpdates, { new: true, runValidators: true });
}

async function updateStatus(restaurantId, status) {
  return Restaurant.findByIdAndUpdate(restaurantId, { status }, { new: true });
}

/**
 * C.10 Search & Filters -- search, filter-by-plan, filter-by-status, and
 * sort are all applied at the query level (never fetched-then-filtered in
 * JS), so this scales past a handful of restaurants. Uses the text index
 * declared on the Restaurant schema for `search`.
 */
async function list({ search, status, plan, sortBy = 'createdAt', sortOrder = 'desc', skip = 0, limit = 25 } = {}) {
  const query = {};
  if (status) query.status = status;
  if (plan) query.plan = plan;
  if (search) query.$text = { $search: search };

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    Restaurant.find(query).sort(sort).skip(skip).limit(limit),
    Restaurant.countDocuments(query),
  ]);
  return { items, total };
}

/** C.2 Dashboard Widgets -- counts grouped by status, one aggregation instead of 3 separate count queries. */
async function countsByStatus() {
  const results = await Restaurant.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts = { active: 0, suspended: 0, archived: 0 };
  results.forEach((r) => { counts[r._id] = r.count; });
  counts.total = counts.active + counts.suspended + counts.archived;
  return counts;
}

module.exports = { create, findById, findByCode, update, updateStatus, list, countsByStatus };
