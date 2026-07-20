// server/app/services/menuItem.service.js
//
// G.3 Menu Items. Business rules (G.8 validation, G.12 error cases) live
// here; repository stays pure data access.

const menuItemRepository = require('../repositories/menuItem.repository');
const categoryRepository = require('../repositories/category.repository');
const activityLogService = require('./activityLog.service');
const AppError = require('../utils/AppError');
const { ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.GENERAL);

async function assertCategoryExists(restaurantId, categoryId) {
  const category = await categoryRepository.findById(restaurantId, categoryId);
  if (!category) throw AppError.badRequest('Selected category does not exist.');
  return category;
}

async function createMenuItem(restaurantId, { name, categoryId, sellingPrice, gstPercentage, displayOrder, ...futureFields }, actor) {
  await assertCategoryExists(restaurantId, categoryId);

  // G.12 "Invalid Price."
  if (typeof sellingPrice !== 'number' || sellingPrice < 0) {
    throw AppError.badRequest('Selling price must be a non-negative number.');
  }

  // G.8 "Duplicate item names... same category mein disallow" (policy
  // defined on menuItem.model.js's index comment; enforced here at the
  // application level too so the error message is friendly rather than a
  // raw Mongo duplicate-key error surfacing to the client).
  const existing = await menuItemRepository.findByNameInCategory(restaurantId, categoryId, name);
  if (existing) {
    throw AppError.conflict(`An item named "${name}" already exists in this category.`);
  }

  const item = await menuItemRepository.create({
    restaurantId,
    categoryId,
    name,
    sellingPrice,
    gstPercentage: gstPercentage ?? 5,
    displayOrder: displayOrder ?? 0,
    ...futureFields, // itemCode, description, foodType, etc. -- G.3 future-ready fields, passed through untouched if present
  });

  log.info('Menu item created', { restaurantId, itemId: item.id });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.MENU_ITEM_CREATED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { itemId: item.id, name, categoryId },
  });
  return item;
}

async function listMenuItems(restaurantId, options) {
  return menuItemRepository.listForRestaurant(restaurantId, options);
}

/** G.4 Search. */
async function searchMenuItems(restaurantId, searchTerm, options) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    throw AppError.badRequest('Search term is required.');
  }
  return menuItemRepository.search(restaurantId, searchTerm.trim(), options);
}

async function updateMenuItem(restaurantId, itemId, updates, actor) {
  if (updates.categoryId) {
    await assertCategoryExists(restaurantId, updates.categoryId);
  }
  if (updates.sellingPrice !== undefined && (typeof updates.sellingPrice !== 'number' || updates.sellingPrice < 0)) {
    throw AppError.badRequest('Selling price must be a non-negative number.');
  }
  if (updates.name || updates.categoryId) {
    const item = await menuItemRepository.findById(restaurantId, itemId);
    if (!item) throw AppError.notFound('Menu item not found.');
    const targetCategoryId = updates.categoryId || item.categoryId;
    const targetName = updates.name || item.name;
    const existing = await menuItemRepository.findByNameInCategory(restaurantId, targetCategoryId, targetName);
    if (existing && String(existing._id) !== String(itemId)) {
      throw AppError.conflict(`An item named "${targetName}" already exists in this category.`);
    }
  }

  const item = await menuItemRepository.update(restaurantId, itemId, updates);
  if (!item) throw AppError.notFound('Menu item not found.');

  log.info('Menu item updated', { restaurantId, itemId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.MENU_ITEM_UPDATED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { itemId, updatedFields: Object.keys(updates) },
  });
  return item;
}

/** G.5 Availability -- the frequent, lightweight toggle, separate from a full update call. */
async function setAvailability(restaurantId, itemId, isAvailable, actor) {
  const item = await menuItemRepository.setAvailability(restaurantId, itemId, isAvailable);
  if (!item) throw AppError.notFound('Menu item not found.');
  log.info('Menu item availability changed', { restaurantId, itemId, isAvailable });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.MENU_ITEM_UPDATED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { itemId, isAvailable },
  });
  return item;
}

async function archiveMenuItem(restaurantId, itemId, actor) {
  const item = await menuItemRepository.archive(restaurantId, itemId);
  if (!item) throw AppError.notFound('Menu item not found.');
  log.info('Menu item archived', { restaurantId, itemId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.MENU_ITEM_DELETED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { itemId },
  });
  return item;
}

/** G.16 Dashboard Integration -- total counts, mapped from this same menu structure. */
async function getMenuStats(restaurantId) {
  const [totalItems, categories] = await Promise.all([
    menuItemRepository.countActive(restaurantId),
    categoryRepository.listForRestaurant(restaurantId),
  ]);
  return { totalItems, totalCategories: categories.length };
}

/** E.5 Download Sync. */
async function getChangedSince(restaurantId, since) {
  return menuItemRepository.findChangedSince(restaurantId, since);
}

module.exports = {
  createMenuItem,
  listMenuItems,
  searchMenuItems,
  updateMenuItem,
  setAvailability,
  archiveMenuItem,
  getMenuStats,
  getChangedSince,
};
