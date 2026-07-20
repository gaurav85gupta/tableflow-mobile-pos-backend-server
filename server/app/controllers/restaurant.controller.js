// server/app/controllers/restaurant.controller.js
//
// Super Admin-only endpoints (mounted under superadmin routes, guarded by
// requireRole('super_admin')). C.3 Restaurant Management.

const restaurantService = require('../services/restaurant.service');
const restaurantConfigService = require('../services/restaurantConfig.service');
const superAdminService = require('../services/superAdmin.service');
const { sendSuccess, asyncHandler, encodeCursor, decodeCursor } = require('../utils');

const create = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const restaurant = await restaurantService.createRestaurant(req.body, actor);
  return sendSuccess(res, { data: restaurant, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { status, plan, search, sortBy, sortOrder, limit, cursor } = req.query;
  const decoded = decodeCursor(cursor);
  const { items, total } = await restaurantService.listRestaurants({
    status, plan, search, sortBy, sortOrder, limit, skip: decoded?.skip || 0,
  });
  const nextSkip = (decoded?.skip || 0) + items.length;
  return sendSuccess(res, {
    data: {
      items,
      nextCursor: nextSkip < total ? encodeCursor({ skip: nextSkip }) : null,
      hasMore: nextSkip < total,
      total,
    },
  });
});

const getById = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.getRestaurantById(req.params.restaurantId);
  return sendSuccess(res, { data: restaurant });
});

const update = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const restaurant = await restaurantService.updateRestaurant(req.params.restaurantId, req.body, actor);
  return sendSuccess(res, { data: restaurant });
});

const activate = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const restaurant = await restaurantService.activateRestaurant(req.params.restaurantId, actor);
  return sendSuccess(res, { data: restaurant });
});

const suspend = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const restaurant = await restaurantService.suspendRestaurant(req.params.restaurantId, actor);
  return sendSuccess(res, { data: restaurant });
});

const archive = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const restaurant = await restaurantService.archiveRestaurant(req.params.restaurantId, actor);
  return sendSuccess(res, { data: restaurant });
});

// C.4 Restaurant Configuration
const getConfig = asyncHandler(async (req, res) => {
  const config = await restaurantConfigService.getConfig(req.params.restaurantId);
  return sendSuccess(res, { data: config });
});

const updateConfig = asyncHandler(async (req, res) => {
  const config = await restaurantConfigService.updateConfig(req.params.restaurantId, req.body);
  return sendSuccess(res, { data: config });
});

module.exports = { create, list, getById, update, activate, suspend, archive, getConfig, updateConfig };
