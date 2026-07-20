// server/app/services/order.service.js
//
// H Phase Counter & Billing Engine -- business rules for the order
// lifecycle. Repository stays pure data access; billCalculation.service.js
// stays pure arithmetic; this file is where the two meet plus H.15/H.16's
// state-machine and validation rules.

const orderRepository = require('../repositories/order.repository');
const menuItemRepository = require('../repositories/menuItem.repository');
const billCalculationService = require('./billCalculation.service');
const activityLogService = require('./activityLog.service');
const AppError = require('../utils/AppError');
const { ORDER_STATUS, ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.GENERAL);

/**
 * H.15 Order Status -- the only transitions this service allows. Modeled
 * as an explicit adjacency map (not scattered `if` checks) so "what can
 * happen next" is answerable by reading one place, and a future Kitchen
 * Display module extending this state machine has a single map to extend.
 */
const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.DRAFT]: [ORDER_STATUS.HOLD, ORDER_STATUS.KOT_PRINTED, ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.HOLD]: [ORDER_STATUS.DRAFT, ORDER_STATUS.KOT_PRINTED, ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.KOT_PRINTED]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAID]: [], // terminal -- a paid order is never mutated further; a correction is a new order/refund workflow, not a future phase's scope yet
  [ORDER_STATUS.CANCELLED]: [], // terminal
};

function assertTransitionAllowed(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw AppError.badRequest(`Cannot move an order from "${currentStatus}" to "${nextStatus}".`);
  }
}

/** H.16 Validation -- "Bill generate tabhi ho" when these all pass. */
async function validateOrderItems(restaurantId, items) {
  if (!items || items.length === 0) {
    throw AppError.badRequest('Cannot create an order with an empty cart.');
  }
  for (const item of items) {
    if (!item.quantity || item.quantity < 1) {
      throw AppError.badRequest('Every item must have a quantity of at least 1.');
    }
    const menuItem = await menuItemRepository.findById(restaurantId, item.menuItemId);
    if (!menuItem) {
      throw AppError.badRequest(`Menu item ${item.menuItemId} does not exist or is no longer available.`);
    }
  }
}

async function createOrder(restaurantId, { deviceId, createdByUserId, orderType, items, customerName, customerMobile, billDiscountType, billDiscountValue }, actor) {
  await validateOrderItems(restaurantId, items);

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const menuItem = await menuItemRepository.findById(restaurantId, item.menuItemId);
      return {
        menuItemId: item.menuItemId,
        name: menuItem.name, // H.4 -- snapshot at order time, see order.model.js's doc comment
        unitPrice: menuItem.sellingPrice,
        gstPercentage: menuItem.gstPercentage,
        quantity: item.quantity,
        discountType: item.discountType || null,
        discountValue: item.discountValue || 0,
      };
    }),
  );

  const bill = billCalculationService.calculateBill(enrichedItems, { billDiscountType, billDiscountValue });
  const displayNumber = await orderRepository.getNextDisplayNumber(restaurantId);

  const order = await orderRepository.create({
    restaurantId,
    deviceId,
    createdByUserId,
    displayNumber,
    orderType,
    items: enrichedItems,
    customerName: customerName || null,
    customerMobile: customerMobile || null,
    billDiscountType: billDiscountType || null,
    billDiscountValue: billDiscountValue || 0,
    subtotal: bill.subtotal,
    totalDiscount: bill.totalDiscount,
    totalTax: bill.totalTax,
    grandTotal: bill.grandTotal,
  });

  log.info('Order created', { restaurantId, orderId: order.id, grandTotal: bill.grandTotal });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.ORDER_CREATED,
    actorType: 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { orderId: order.id, grandTotal: bill.grandTotal, itemCount: enrichedItems.length },
  });
  return order;
}

/** H.3/H.4/H.7 -- editing a still-open order's cart/discounts recomputes the bill from scratch via the same centralized calculator, never a partial in-place adjustment. */
async function updateOrderItems(restaurantId, orderId, { items, billDiscountType, billDiscountValue, customerName, customerMobile, orderType }, actor) {
  const existing = await orderRepository.findById(restaurantId, orderId);
  if (!existing) throw AppError.notFound('Order not found.');
  if (![ORDER_STATUS.DRAFT, ORDER_STATUS.HOLD].includes(existing.status)) {
    throw AppError.badRequest(`Cannot edit an order that is already "${existing.status}".`);
  }

  const targetItems = items || existing.items;
  if (items) await validateOrderItems(restaurantId, items);

  const enrichedItems = items
    ? await Promise.all(
        items.map(async (item) => {
          const menuItem = await menuItemRepository.findById(restaurantId, item.menuItemId);
          if (!menuItem) throw AppError.badRequest(`Menu item ${item.menuItemId} does not exist.`);
          return {
            menuItemId: item.menuItemId,
            name: menuItem.name,
            unitPrice: menuItem.sellingPrice,
            gstPercentage: menuItem.gstPercentage,
            quantity: item.quantity,
            discountType: item.discountType || null,
            discountValue: item.discountValue || 0,
          };
        }),
      )
    : existing.items;

  const bill = billCalculationService.calculateBill(enrichedItems, {
    billDiscountType: billDiscountType !== undefined ? billDiscountType : existing.billDiscountType,
    billDiscountValue: billDiscountValue !== undefined ? billDiscountValue : existing.billDiscountValue,
  });

  const order = await orderRepository.update(restaurantId, orderId, {
    items: enrichedItems,
    billDiscountType: billDiscountType !== undefined ? billDiscountType : existing.billDiscountType,
    billDiscountValue: billDiscountValue !== undefined ? billDiscountValue : existing.billDiscountValue,
    customerName: customerName !== undefined ? customerName : existing.customerName,
    customerMobile: customerMobile !== undefined ? customerMobile : existing.customerMobile,
    orderType: orderType || existing.orderType,
    subtotal: bill.subtotal,
    totalDiscount: bill.totalDiscount,
    totalTax: bill.totalTax,
    grandTotal: bill.grandTotal,
  });

  await activityLogService.record({
    action: ACTIVITY_ACTIONS.ORDER_UPDATED,
    actorType: 'user',
    actorId: actor?.userId,
    actorLabel: actor?.label,
    restaurantId,
    details: { orderId, grandTotal: bill.grandTotal },
  });
  return order;
}

/** H.12 Hold Order. */
async function holdOrder(restaurantId, orderId, actor) {
  const existing = await orderRepository.findById(restaurantId, orderId);
  if (!existing) throw AppError.notFound('Order not found.');
  assertTransitionAllowed(existing.status, ORDER_STATUS.HOLD);

  const order = await orderRepository.update(restaurantId, orderId, { status: ORDER_STATUS.HOLD });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.ORDER_HELD, actorType: 'user', actorId: actor?.userId, actorLabel: actor?.label, restaurantId, details: { orderId },
  });
  return order;
}

/** H.12 Resume. */
async function resumeOrder(restaurantId, orderId, actor) {
  const existing = await orderRepository.findById(restaurantId, orderId);
  if (!existing) throw AppError.notFound('Order not found.');
  assertTransitionAllowed(existing.status, ORDER_STATUS.DRAFT);

  const order = await orderRepository.update(restaurantId, orderId, { status: ORDER_STATUS.DRAFT });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.ORDER_RESUMED, actorType: 'user', actorId: actor?.userId, actorLabel: actor?.label, restaurantId, details: { orderId },
  });
  return order;
}

/** H.10 KOT. */
async function markKotPrinted(restaurantId, orderId, actor) {
  const existing = await orderRepository.findById(restaurantId, orderId);
  if (!existing) throw AppError.notFound('Order not found.');
  assertTransitionAllowed(existing.status, ORDER_STATUS.KOT_PRINTED);

  const order = await orderRepository.update(restaurantId, orderId, { status: ORDER_STATUS.KOT_PRINTED, kotPrintedAt: new Date() });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.ORDER_KOT_PRINTED, actorType: 'user', actorId: actor?.userId, actorLabel: actor?.label, restaurantId, details: { orderId },
  });
  return order;
}

/** H.9 Payment -- "Payment complete hone par order finalize." */
async function completePayment(restaurantId, orderId, payments, actor) {
  const existing = await orderRepository.findById(restaurantId, orderId);
  if (!existing) throw AppError.notFound('Order not found.');
  assertTransitionAllowed(existing.status, ORDER_STATUS.PAID);

  if (!payments || payments.length === 0) {
    throw AppError.badRequest('At least one payment is required to complete an order.'); // H.16 "Invalid Payment"
  }
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(totalPaid - existing.grandTotal) > 0.01) {
    throw AppError.badRequest(`Payment total (${totalPaid}) does not match the bill total (${existing.grandTotal}).`);
  }

  const order = await orderRepository.update(restaurantId, orderId, {
    status: ORDER_STATUS.PAID,
    payments,
    paidAt: new Date(),
  });

  log.info('Order paid', { restaurantId, orderId, grandTotal: existing.grandTotal });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.ORDER_PAID, actorType: 'user', actorId: actor?.userId, actorLabel: actor?.label, restaurantId, details: { orderId, grandTotal: existing.grandTotal },
  });
  return order;
}

async function cancelOrder(restaurantId, orderId, actor) {
  const existing = await orderRepository.findById(restaurantId, orderId);
  if (!existing) throw AppError.notFound('Order not found.');
  assertTransitionAllowed(existing.status, ORDER_STATUS.CANCELLED);

  const order = await orderRepository.update(restaurantId, orderId, { status: ORDER_STATUS.CANCELLED, cancelledAt: new Date() });
  await activityLogService.record({
    action: ACTIVITY_ACTIONS.ORDER_CANCELLED, actorType: 'user', actorId: actor?.userId, actorLabel: actor?.label, restaurantId, details: { orderId },
  });
  return order;
}

async function listOrders(restaurantId, options) {
  return orderRepository.listForRestaurant(restaurantId, options);
}

async function listHeldOrders(restaurantId) {
  return orderRepository.listHeld(restaurantId);
}

/** H.13 Dashboard Integration. */
async function getTodayStats(restaurantId) {
  return orderRepository.getTodayStats(restaurantId);
}

/** E.5 Download Sync. */
async function getChangedSince(restaurantId, since) {
  return orderRepository.findChangedSince(restaurantId, since);
}

module.exports = {
  createOrder,
  updateOrderItems,
  holdOrder,
  resumeOrder,
  markKotPrinted,
  completePayment,
  cancelOrder,
  listOrders,
  listHeldOrders,
  getTodayStats,
  getChangedSince,
};
