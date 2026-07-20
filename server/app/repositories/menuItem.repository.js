// server/app/repositories/menuItem.repository.js

const MenuItem = require('../models/menuItem.model');

async function create(data) {
  return MenuItem.create(data);
}

async function findById(restaurantId, itemId) {
  return MenuItem.findOne({ _id: itemId, restaurantId, isArchived: false });
}

async function findByNameInCategory(restaurantId, categoryId, name) {
  return MenuItem.findOne({ restaurantId, categoryId, name, isArchived: false });
}

/** G.11 Performance -- served directly by the compound index declared on the schema; no in-memory sort/filter needed even at 1000+ items. */
async function listForRestaurant(restaurantId, { categoryId, availableOnly = false, skip = 0, limit = 100 } = {}) {
  const query = { restaurantId, isArchived: false };
  if (categoryId) query.categoryId = categoryId;
  if (availableOnly) query.isAvailable = true;

  const [items, total] = await Promise.all([
    MenuItem.find(query).sort({ categoryId: 1, displayOrder: 1, createdAt: 1 }).skip(skip).limit(limit),
    MenuItem.countDocuments(query),
  ]);
  return { items, total };
}

/** G.4 Search -- text index search, restaurant-scoped, name (+ itemCode) only for now per this phase's scope. */
async function search(restaurantId, searchTerm, { skip = 0, limit = 50 } = {}) {
  const query = { restaurantId, isArchived: false, $text: { $search: searchTerm } };
  const [items, total] = await Promise.all([
    MenuItem.find(query, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).skip(skip).limit(limit),
    MenuItem.countDocuments(query),
  ]);
  return { items, total };
}

async function update(restaurantId, itemId, updates) {
  return MenuItem.findOneAndUpdate(
    { _id: itemId, restaurantId, isArchived: false },
    { $set: updates, $inc: { version: 1 } },
    { new: true, runValidators: true },
  );
}

/** G.5 Availability -- toggled independently of a full update, since this is the single most frequent menu-management action during service hours. */
async function setAvailability(restaurantId, itemId, isAvailable) {
  return MenuItem.findOneAndUpdate(
    { _id: itemId, restaurantId, isArchived: false },
    { $set: { isAvailable }, $inc: { version: 1 } },
    { new: true },
  );
}

/** G.12 "Delete Restriction" -- soft delete only. */
async function archive(restaurantId, itemId) {
  return MenuItem.findOneAndUpdate(
    { _id: itemId, restaurantId },
    { $set: { isArchived: true }, $inc: { version: 1 } },
    { new: true },
  );
}

async function countByCategory(restaurantId, categoryId) {
  return MenuItem.countDocuments({ restaurantId, categoryId, isArchived: false });
}

async function countActive(restaurantId) {
  return MenuItem.countDocuments({ restaurantId, isArchived: false });
}

/** E.6 Incremental Sync. */
async function findChangedSince(restaurantId, since) {
  return MenuItem.find({ restaurantId, updatedAt: { $gt: new Date(since) } }).sort({ updatedAt: 1 });
}

module.exports = {
  create,
  findById,
  findByNameInCategory,
  listForRestaurant,
  search,
  update,
  setAvailability,
  archive,
  countByCategory,
  countActive,
  findChangedSince,
};
