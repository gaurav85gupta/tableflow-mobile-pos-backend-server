// server/app/validators/menu.validator.js
//
// G.2/G.3/G.8 Validation.

const Joi = require('joi');

const createCategory = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  displayOrder: Joi.number().integer().min(0).default(0),
});

const updateCategory = Joi.object({
  name: Joi.string().trim().min(1).max(80),
  displayOrder: Joi.number().integer().min(0),
}).min(1);

const categoryIdParam = Joi.object({
  categoryId: Joi.string().hex().length(24).required(),
});

const setCategoryEnabled = Joi.object({
  isEnabled: Joi.boolean().required(),
});

// G.3 -- basic required fields + optional future-ready fields, all
// accepted now so the schema (menuItem.model.js) doesn't need a migration
// later when a UI for them exists (G.14).
const createMenuItem = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  categoryId: Joi.string().hex().length(24).required(),
  sellingPrice: Joi.number().min(0).required(),
  gstPercentage: Joi.number().min(0).max(100).default(5),
  displayOrder: Joi.number().integer().min(0).default(0),
  // Future-ready fields (G.3) -- optional, no UI requires them yet.
  itemCode: Joi.string().trim().max(50).allow('', null),
  description: Joi.string().trim().max(500).allow('', null),
  foodType: Joi.string().valid('veg', 'non_veg', 'egg').allow(null),
  barcode: Joi.string().trim().max(50).allow('', null),
  imageUrl: Joi.string().uri().allow('', null),
  preparationTimeMinutes: Joi.number().integer().min(0).allow(null),
  trackInventory: Joi.boolean(),
  baseCost: Joi.number().min(0).allow(null),
});

const updateMenuItem = Joi.object({
  name: Joi.string().trim().min(1).max(120),
  categoryId: Joi.string().hex().length(24),
  sellingPrice: Joi.number().min(0),
  gstPercentage: Joi.number().min(0).max(100),
  displayOrder: Joi.number().integer().min(0),
  itemCode: Joi.string().trim().max(50).allow('', null),
  description: Joi.string().trim().max(500).allow('', null),
  foodType: Joi.string().valid('veg', 'non_veg', 'egg').allow(null),
  barcode: Joi.string().trim().max(50).allow('', null),
  imageUrl: Joi.string().uri().allow('', null),
  preparationTimeMinutes: Joi.number().integer().min(0).allow(null),
  trackInventory: Joi.boolean(),
  baseCost: Joi.number().min(0).allow(null),
}).min(1);

const itemIdParam = Joi.object({
  itemId: Joi.string().hex().length(24).required(),
});

const setAvailability = Joi.object({
  isAvailable: Joi.boolean().required(),
});

const listMenuItemsQuery = Joi.object({
  categoryId: Joi.string().hex().length(24).optional(),
  availableOnly: Joi.boolean().default(false),
  skip: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(200).default(100),
});

// G.4 Search.
const searchQuery = Joi.object({
  q: Joi.string().trim().min(1).max(100).required(),
  skip: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

module.exports = {
  createCategory,
  updateCategory,
  categoryIdParam,
  setCategoryEnabled,
  createMenuItem,
  updateMenuItem,
  itemIdParam,
  setAvailability,
  listMenuItemsQuery,
  searchQuery,
};
