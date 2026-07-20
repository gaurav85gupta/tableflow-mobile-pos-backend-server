// server/app/validators/auth.validator.js
//
// B.13 Validation Layer. Each domain's request schemas live together in one
// file since they're small and reviewed as a set (a login schema is
// meaningless without seeing the refresh/logout schemas right next to it).

const Joi = require('joi');

const login = Joi.object({
  restaurantCode: Joi.string().trim().min(2).max(20).required(),
  username: Joi.string().trim().min(2).max(50).required(),
  password: Joi.string().min(6).max(128).required(),
  deviceIdentifier: Joi.string().trim().min(4).max(200).required(),
  deviceName: Joi.string().trim().max(100).optional(),
});

const refresh = Joi.object({
  refreshToken: Joi.string().required(),
});

const logout = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = { login, refresh, logout };
