// server/app/validators/restaurantConfig.validator.js
//
// C.4 Restaurant Configuration.

const Joi = require('joi');

const updateConfig = Joi.object({
  businessType: Joi.string().trim().max(50),
  defaultTax: Joi.object({
    label: Joi.string().trim().max(30),
    percentage: Joi.number().min(0).max(100),
    inclusive: Joi.boolean(),
  }),
  billSettings: Joi.object({
    invoicePrefix: Joi.string().trim().max(10),
    roundOffTotal: Joi.boolean(),
    showTaxBreakdown: Joi.boolean(),
  }),
  printerConfig: Joi.object({
    paperWidthMm: Joi.number().valid(58, 80),
    printLogo: Joi.boolean(),
    kotCopies: Joi.number().integer().min(1).max(5),
  }),
}).min(1);

module.exports = { updateConfig };
