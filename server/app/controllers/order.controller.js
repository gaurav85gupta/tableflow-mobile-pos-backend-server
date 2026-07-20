// server/app/controllers/order.controller.js
//
// H Phase -- thin, per B.2's rule. All logic in order.service.js.

const orderService = require('../services/order.service');
const { sendSuccess, asyncHandler } = require('../utils');

function actorFrom(req) {
  return { userId: req.tenant.userId, role: req.tenant.role };
}

const create = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.tenant.restaurantId, { ...req.body, createdByUserId: req.tenant.userId }, actorFrom(req));
  return sendSuccess(res, { data: order, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { items, total } = await orderService.listOrders(req.tenant.restaurantId, req.query);
  return sendSuccess(res, { data: { items, total } });
});

/** H.12 Hold Order -- listing just the held ones, for a future "resume" picker UI. */
const listHeld = asyncHandler(async (req, res) => {
  const items = await orderService.listHeldOrders(req.tenant.restaurantId);
  return sendSuccess(res, { data: { items, total: items.length } });
});

const update = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderItems(req.tenant.restaurantId, req.params.orderId, req.body, actorFrom(req));
  return sendSuccess(res, { data: order });
});

const hold = asyncHandler(async (req, res) => {
  const order = await orderService.holdOrder(req.tenant.restaurantId, req.params.orderId, actorFrom(req));
  return sendSuccess(res, { data: order });
});

const resume = asyncHandler(async (req, res) => {
  const order = await orderService.resumeOrder(req.tenant.restaurantId, req.params.orderId, actorFrom(req));
  return sendSuccess(res, { data: order });
});

const markKotPrinted = asyncHandler(async (req, res) => {
  const order = await orderService.markKotPrinted(req.tenant.restaurantId, req.params.orderId, actorFrom(req));
  return sendSuccess(res, { data: order });
});

const completePayment = asyncHandler(async (req, res) => {
  const order = await orderService.completePayment(req.tenant.restaurantId, req.params.orderId, req.body.payments, actorFrom(req));
  return sendSuccess(res, { data: order });
});

const cancel = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(req.tenant.restaurantId, req.params.orderId, actorFrom(req));
  return sendSuccess(res, { data: order });
});

/** H.13 Dashboard Integration. */
const todayStats = asyncHandler(async (req, res) => {
  const stats = await orderService.getTodayStats(req.tenant.restaurantId);
  return sendSuccess(res, { data: stats });
});

module.exports = { create, list, listHeld, update, hold, resume, markKotPrinted, completePayment, cancel, todayStats };
