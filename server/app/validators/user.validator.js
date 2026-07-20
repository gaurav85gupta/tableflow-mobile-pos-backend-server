// server/app/validators/user.validator.js
//
// B.8 / C.7 User Management.

const Joi = require('joi');
const { USER_ROLES } = require('../config/constants');

const createUser = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  username: Joi.string().trim().min(3).max(50).required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid(...Object.values(USER_ROLES)).default(USER_ROLES.CASHIER),
});

/** C.7 Edit -- name/role only; username and password changes aren't exposed via this endpoint in this phase. */
const updateUser = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  role: Joi.string().valid(...Object.values(USER_ROLES)),
}).min(1);

const userIdParam = Joi.object({
  userId: Joi.string().hex().length(24).required(),
});

module.exports = { createUser, updateUser, userIdParam };
