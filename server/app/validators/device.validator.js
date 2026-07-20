// server/app/validators/device.validator.js

const Joi = require('joi');

const deviceIdParam = Joi.object({
  deviceId: Joi.string().hex().length(24).required(),
});

module.exports = { deviceIdParam };
