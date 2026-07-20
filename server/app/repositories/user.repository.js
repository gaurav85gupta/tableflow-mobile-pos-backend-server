// server/app/repositories/user.repository.js

const User = require('../models/user.model');

async function create(data) {
  return User.create(data);
}

/** Includes passwordHash explicitly since the schema marks it `select: false` by default. */
async function findByUsernameWithPassword(restaurantId, username) {
  return User.findOne({ restaurantId, username: username.toLowerCase() }).select('+passwordHash');
}

async function findById(userId) {
  return User.findById(userId);
}

async function findByRestaurant(restaurantId, { skip = 0, limit = 25 } = {}) {
  const query = { restaurantId };
  const [items, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);
  return { items, total };
}

/** C.7 -- edit a user's profile fields. Password changes go through a separate path (not built in this phase). */
async function update(restaurantId, userId, updates) {
  const allowedFields = ['name', 'role'];
  const safeUpdates = {};
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) safeUpdates[field] = updates[field];
  });
  return User.findOneAndUpdate({ _id: userId, restaurantId }, safeUpdates, { new: true, runValidators: true });
}

async function setActive(restaurantId, userId, isActive) {
  return User.findOneAndUpdate({ _id: userId, restaurantId }, { isActive }, { new: true });
}

module.exports = { create, findByUsernameWithPassword, findById, findByRestaurant, update, setActive };
