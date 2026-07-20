// server/app/repositories/category.repository.js
//
// B.2 -- pure Mongoose data access, no business logic (that's category.service.js).

const Category = require('../models/category.model');

async function create(data) {
  return Category.create(data);
}

async function findById(restaurantId, categoryId) {
  return Category.findOne({ _id: categoryId, restaurantId, isArchived: false });
}

async function findByName(restaurantId, name) {
  return Category.findOne({ restaurantId, name, isArchived: false });
}

async function listForRestaurant(restaurantId, { includeDisabled = true } = {}) {
  const query = { restaurantId, isArchived: false };
  if (!includeDisabled) query.isEnabled = true;
  return Category.find(query).sort({ displayOrder: 1, createdAt: 1 });
}

async function update(restaurantId, categoryId, updates) {
  return Category.findOneAndUpdate(
    { _id: categoryId, restaurantId, isArchived: false },
    { $set: updates, $inc: { version: 1 } },
    { new: true, runValidators: true },
  );
}

async function setEnabled(restaurantId, categoryId, isEnabled) {
  return Category.findOneAndUpdate(
    { _id: categoryId, restaurantId, isArchived: false },
    { $set: { isEnabled }, $inc: { version: 1 } },
    { new: true },
  );
}

/** G.12 "Delete Restriction" -- soft delete only; the service layer decides whether this is allowed (no items reference this category). */
async function archive(restaurantId, categoryId) {
  return Category.findOneAndUpdate(
    { _id: categoryId, restaurantId },
    { $set: { isArchived: true }, $inc: { version: 1 } },
    { new: true },
  );
}

/** E.6 Incremental Sync -- categories changed after `since`, for the Android download-sync pass. */
async function findChangedSince(restaurantId, since) {
  return Category.find({ restaurantId, updatedAt: { $gt: new Date(since) } }).sort({ updatedAt: 1 });
}

async function countActive(restaurantId) {
  return Category.countDocuments({ restaurantId, isArchived: false });
}

module.exports = { create, findById, findByName, listForRestaurant, update, setEnabled, archive, findChangedSince, countActive };
