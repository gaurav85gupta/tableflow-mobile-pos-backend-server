// server/app/services/category.service.js
//
// G.2 Categories. Business rules live here, not in the controller (B.2)
// and not in the repository (which is pure data access).

const categoryRepository = require('../repositories/category.repository');
const menuItemRepository = require('../repositories/menuItem.repository');
const activityLogService = require('./activityLog.service');
const AppError = require('../utils/AppError');
const { ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.GENERAL);

async function createCategory(restaurantId, { name, displayOrder }, actor) {
  const existing = await categoryRepository.findByName(restaurantId, name);
  if (existing) {
    // G.12 "Duplicate Category" error case.
    throw AppError.conflict(`A category named "${name}" already exists.`);
  }

  const category = await categoryRepository.create({ restaurantId, name, displayOrder: displayOrder ?? 0 });
  log.info('Category created', { restaurantId, categoryId: category.id });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.CATEGORY_CREATED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { categoryId: category.id, name },
  });
  return category;
}

async function listCategories(restaurantId, options) {
  return categoryRepository.listForRestaurant(restaurantId, options);
}

async function updateCategory(restaurantId, categoryId, updates, actor) {
  if (updates.name) {
    const existing = await categoryRepository.findByName(restaurantId, updates.name);
    if (existing && String(existing._id) !== String(categoryId)) {
      throw AppError.conflict(`A category named "${updates.name}" already exists.`);
    }
  }

  const category = await categoryRepository.update(restaurantId, categoryId, updates);
  if (!category) throw AppError.notFound('Category not found.');

  log.info('Category updated', { restaurantId, categoryId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.CATEGORY_UPDATED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { categoryId, updatedFields: Object.keys(updates) },
  });
  return category;
}

async function setCategoryEnabled(restaurantId, categoryId, isEnabled, actor) {
  const category = await categoryRepository.setEnabled(restaurantId, categoryId, isEnabled);
  if (!category) throw AppError.notFound('Category not found.');
  log.info('Category enabled state changed', { restaurantId, categoryId, isEnabled });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.CATEGORY_UPDATED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { categoryId, isEnabled },
  });
  return category;
}

/**
 * G.12 "Delete Restriction" -- a category with any (non-archived) menu
 * items cannot be archived; the caller must move or archive those items
 * first. This is the actual business rule enforcement; the repository
 * layer has no opinion on this.
 */
async function archiveCategory(restaurantId, categoryId, actor) {
  const itemCount = await menuItemRepository.countByCategory(restaurantId, categoryId);
  if (itemCount > 0) {
    throw AppError.badRequest(
      `This category still has ${itemCount} menu item(s). Move or remove them before deleting the category.`,
    );
  }

  const category = await categoryRepository.archive(restaurantId, categoryId);
  if (!category) throw AppError.notFound('Category not found.');
  log.info('Category archived', { restaurantId, categoryId });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.CATEGORY_DELETED,
    actorType: actor?.role === 'super_admin' ? 'super_admin' : 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { categoryId },
  });
  return category;
}

/** E.5 Download Sync -- categories changed since the Android client's last watermark. */
async function getChangedSince(restaurantId, since) {
  return categoryRepository.findChangedSince(restaurantId, since);
}

module.exports = { createCategory, listCategories, updateCategory, setCategoryEnabled, archiveCategory, getChangedSince };
