// server/app/controllers/user.controller.js
//
// Restaurant-scoped: every method uses req.tenant.restaurantId (set by
// tenant.middleware.js), never anything from the request body/params.
// Used by restaurant owners/managers managing their OWN staff.

const userService = require('../services/user.service');
const { sendSuccess, asyncHandler } = require('../utils');

function actorFrom(req) {
  return { userId: req.tenant.userId, role: req.tenant.role };
}

const create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.tenant.restaurantId, req.body, actorFrom(req));
  return sendSuccess(res, { data: user, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { items, total } = await userService.listUsers(req.tenant.restaurantId, req.query);
  return sendSuccess(res, { data: { items, total } });
});

const getById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.tenant.restaurantId, req.params.userId);
  return sendSuccess(res, { data: user });
});

const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.tenant.restaurantId, req.params.userId, req.body, actorFrom(req));
  return sendSuccess(res, { data: user });
});

const deactivate = asyncHandler(async (req, res) => {
  const user = await userService.deactivateUser(req.tenant.restaurantId, req.params.userId, actorFrom(req));
  return sendSuccess(res, { data: user });
});

const reactivate = asyncHandler(async (req, res) => {
  const user = await userService.reactivateUser(req.tenant.restaurantId, req.params.userId, actorFrom(req));
  return sendSuccess(res, { data: user });
});

module.exports = { create, list, getById, update, deactivate, reactivate };
