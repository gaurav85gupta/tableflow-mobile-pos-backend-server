// server/app/validators/subscription.validator.js
//
// Subscription + FeatureFlag validators combined in one file: both are
// small, both belong to the "what can this restaurant use" concern.
// C.5 Subscription Management / C.6 Feature Flag Management.

const Joi = require('joi');
const { FEATURE_KEYS } = require('../config/constants');

const changePlan = Joi.object({
  plan: Joi.string().trim().min(2).max(50).required(),
  expiresAt: Joi.date().iso().required(),
  features: Joi.array().items(Joi.string().valid(...Object.values(FEATURE_KEYS))).min(1).required(),
});

/** C.5 Renewal. */
const renew = Joi.object({
  extendByDays: Joi.number().integer().min(1).max(3650).required(),
});

const setFeatureFlag = Joi.object({
  key: Joi.string().valid(...Object.values(FEATURE_KEYS)).required(),
  value: Joi.boolean().required(),
});

module.exports = { changePlan, renew, setFeatureFlag };
