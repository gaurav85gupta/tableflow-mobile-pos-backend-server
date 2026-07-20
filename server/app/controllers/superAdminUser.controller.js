// server/app/controllers/superAdminUser.controller.js
//
// C.7 User Management -- Super Admin variant. Same userService as
// restaurant.routes.js's own user.controller.js, but the restaurantId comes
// from a path param (a Super Admin manages ANY restaurant's users) instead
// of from req.tenant. requireRole('super_admin') on the route is what makes
// this safe -- an ordinary owner/manager/cashier can never reach these paths.

const userService = require('../services/user.service');
const superAdminService = require('../services/superAdmin.service');
const { sendSuccess, asyncHandler } = require('../utils');

const create = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const user = await userService.createUser(req.params.restaurantId, req.body, actor);
  return sendSuccess(res, { data: user, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { items, total } = await userService.listUsers(req.params.restaurantId, req.query);
  return sendSuccess(res, { data: { items, total } });
});

const update = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const user = await userService.updateUser(req.params.restaurantId, req.params.userId, req.body, actor);
  return sendSuccess(res, { data: user });
});

const deactivate = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const user = await userService.deactivateUser(req.params.restaurantId, req.params.userId, actor);
  return sendSuccess(res, { data: user });
});

const reactivate = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const user = await userService.reactivateUser(req.params.restaurantId, req.params.userId, actor);
  return sendSuccess(res, { data: user });
});

module.exports = { create, list, update, deactivate, reactivate };
