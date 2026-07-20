// server/app/validators/sync.validator.js

const Joi = require('joi');

const syncChangeDto = Joi.object({
  queueEntryId: Joi.number().integer().required(),
  entityType: Joi.string().required(),
  entityLocalId: Joi.string().required(),
  operation: Joi.string().valid('CREATE', 'UPDATE', 'DELETE').required(),
  baseVersion: Joi.number().integer().min(0).required(),
  payload: Joi.string().required(), // JSON string, parsed by the entity handler, not here
});

const uploadRequest = Joi.object({
  deviceId: Joi.string().required(),
  changes: Joi.array().items(syncChangeDto).min(1).max(100).required(), // E.15 batch ceiling, matches Android's own BATCH_SIZE=25 with headroom
});

const downloadRequest = Joi.object({
  entityTypes: Joi.array().items(Joi.string()).min(1).required(),
  since: Joi.number().integer().min(0).required(),
});

module.exports = { uploadRequest, downloadRequest };
