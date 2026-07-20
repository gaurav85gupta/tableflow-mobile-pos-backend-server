// server/app/validators/restaurant.validator.js
//
// C.3 Restaurant Management -- create/edit schemas extended with owner
// name, GST (optional), timezone, currency, and plan.

const Joi = require('joi');

const createRestaurant = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  ownerName: Joi.string().trim().min(2).max(120).required(),
  contactEmail: Joi.string().trim().email().required(),
  contactPhone: Joi.string().trim().max(20).required(),
  address: Joi.string().trim().max(300).optional(),
  gstNumber: Joi.string().trim().max(30).allow('', null).optional(),
  plan: Joi.string().trim().max(50).optional(),
  timezone: Joi.string().trim().max(50).default('Asia/Kolkata'),
  currency: Joi.string().trim().max(10).default('INR'),
});

/** C.3 Edit -- every field optional (partial update), but at least one must be present. */
const updateRestaurant = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  ownerName: Joi.string().trim().min(2).max(120),
  contactEmail: Joi.string().trim().email(),
  contactPhone: Joi.string().trim().max(20),
  address: Joi.string().trim().max(300).allow(''),
  gstNumber: Joi.string().trim().max(30).allow('', null),
  timezone: Joi.string().trim().max(50),
  currency: Joi.string().trim().max(10),
}).min(1);

/** C.10 Search & Filters. */
const listRestaurants = Joi.object({
  status: Joi.string().valid('active', 'suspended', 'archived').optional(),
  plan: Joi.string().trim().max(50).optional(),
  search: Joi.string().trim().max(100).optional(),
  sortBy: Joi.string().valid('createdAt', 'name', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

const restaurantIdParam = Joi.object({
  restaurantId: Joi.string().hex().length(24).required(),
});

module.exports = { createRestaurant, updateRestaurant, listRestaurants, restaurantIdParam };
