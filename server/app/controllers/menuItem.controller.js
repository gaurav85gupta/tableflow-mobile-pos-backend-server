// server/app/controllers/menuItem.controller.js
//
// G.3/G.4/G.5/G.16 Menu Items -- thin, per B.2's rule.

const menuItemService = require('../services/menuItem.service');
const { sendSuccess, asyncHandler } = require('../utils');

function actorFrom(req) {
  return { userId: req.tenant.userId, role: req.tenant.role };
}

const create = asyncHandler(async (req, res) => {
  const item = await menuItemService.createMenuItem(req.tenant.restaurantId, req.body, actorFrom(req));
  return sendSuccess(res, { data: item, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { items, total } = await menuItemService.listMenuItems(req.tenant.restaurantId, req.query);
  return sendSuccess(res, { data: { items, total } });
});

/** G.4 Search -- separate endpoint (not just a `?q=` on `list`) so it's obvious at the route level this uses the text index, not the display-order listing query. */
const search = asyncHandler(async (req, res) => {
  const { q, ...options } = req.query;
  const { items, total } = await menuItemService.searchMenuItems(req.tenant.restaurantId, q, options);
  return sendSuccess(res, { data: { items, total } });
});

const update = asyncHandler(async (req, res) => {
  const item = await menuItemService.updateMenuItem(req.tenant.restaurantId, req.params.itemId, req.body, actorFrom(req));
  return sendSuccess(res, { data: item });
});

const setAvailability = asyncHandler(async (req, res) => {
  const item = await menuItemService.setAvailability(req.tenant.restaurantId, req.params.itemId, req.body.isAvailable, actorFrom(req));
  return sendSuccess(res, { data: item });
});

const archive = asyncHandler(async (req, res) => {
  const item = await menuItemService.archiveMenuItem(req.tenant.restaurantId, req.params.itemId, actorFrom(req));
  return sendSuccess(res, { data: item });
});

/** G.16 Dashboard Integration. */
const stats = asyncHandler(async (req, res) => {
  const result = await menuItemService.getMenuStats(req.tenant.restaurantId);
  return sendSuccess(res, { data: result });
});

module.exports = { create, list, search, update, setAvailability, archive, stats };
