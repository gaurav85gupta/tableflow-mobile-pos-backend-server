// server/app/validators/superAdminAuth.validator.js

const Joi = require('joi');

const login = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

const refresh = Joi.object({
  refreshToken: Joi.string().required(),
});

const changePassword = Joi.object({
  currentPassword: Joi.string().min(6).max(128).required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

module.exports = { login, refresh, changePassword };
