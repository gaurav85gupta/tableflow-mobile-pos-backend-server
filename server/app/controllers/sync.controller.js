// server/app/controllers/sync.controller.js
//
// E.4/E.5 -- thin, per B.2's rule. All logic in sync.service.js.

const syncService = require('../services/sync.service');
const { sendSuccess, asyncHandler } = require('../utils');

const upload = asyncHandler(async (req, res) => {
  const actor = { userId: req.tenant.userId, role: req.tenant.role };
  const results = await syncService.processUploadBatch(req.tenant.restaurantId, req.body.changes, actor);
  return sendSuccess(res, { data: { results } });
});

const download = asyncHandler(async (req, res) => {
  const { entityTypes, since } = req.body;
  const result = await syncService.processDownload(req.tenant.restaurantId, entityTypes, since);
  return sendSuccess(res, { data: result });
});

module.exports = { upload, download };
