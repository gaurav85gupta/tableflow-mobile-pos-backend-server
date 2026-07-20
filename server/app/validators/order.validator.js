// server/app/validators/order.validator.js
//
// H.16 Validation.

const Joi = require('joi');
const { ORDER_TYPE, PAYMENT_METHOD, DISCOUNT_TYPE } = require('../config/constants');

const orderItemInput = Joi.object({
  menuItemId: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).required(),
  discountType: Joi.string().valid(...Object.values(DISCOUNT_TYPE)).allow(null),
  discountValue: Joi.number().min(0).default(0),
});

const createOrder = Joi.object({
  deviceId: Joi.string().hex().length(24).required(),
  orderType: Joi.string().valid(...Object.values(ORDER_TYPE)).default(ORDER_TYPE.DINE_IN),
  items: Joi.array().items(orderItemInput).min(1).required(), // H.16 "Empty Cart"
  customerName: Joi.string().trim().max(120).allow('', null),
  customerMobile: Joi.string().trim().max(20).allow('', null),
  billDiscountType: Joi.string().valid(...Object.values(DISCOUNT_TYPE)).allow(null),
  billDiscountValue: Joi.number().min(0).default(0),
});

const updateOrder = Joi.object({
  items: Joi.array().items(orderItemInput).min(1),
  orderType: Joi.string().valid(...Object.values(ORDER_TYPE)),
  customerName: Joi.string().trim().max(120).allow('', null),
  customerMobile: Joi.string().trim().max(20).allow('', null),
  billDiscountType: Joi.string().valid(...Object.values(DISCOUNT_TYPE)).allow(null),
  billDiscountValue: Joi.number().min(0),
}).min(1);

const orderIdParam = Joi.object({
  orderId: Joi.string().hex().length(24).required(),
});

const paymentInput = Joi.object({
  method: Joi.string().valid(...Object.values(PAYMENT_METHOD)).required(),
  amount: Joi.number().min(0).required(),
  referenceNumber: Joi.string().trim().max(100).allow('', null),
});

const completePayment = Joi.object({
  payments: Joi.array().items(paymentInput).min(1).required(), // H.16 "Invalid Payment"
});

const listOrdersQuery = Joi.object({
  status: Joi.string().valid('draft', 'hold', 'kot_printed', 'paid', 'cancelled').optional(),
  skip: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

module.exports = { createOrder, updateOrder, orderIdParam, completePayment, listOrdersQuery };
