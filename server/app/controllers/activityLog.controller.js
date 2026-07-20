// server/app/controllers/activityLog.controller.js
//
// C.9 Activity Logs -- read-only endpoints. No update/delete controller
// methods exist here by design (see models/activityLog.model.js).

const activityLogService = require('../services/activityLog.service');
const { sendSuccess, asyncHandler, encodeCursor, decodeCursor } = require('../utils');

const list = asyncHandler(async (req, res) => {
  const { restaurantId, action, limit, cursor } = req.query;
  const decoded = decodeCursor(cursor);
  const { items, total } = await activityLogService.listLogs({
    restaurantId, action, limit: limit ? parseInt(limit, 10) : undefined, skip: decoded?.skip || 0,
  });
  const nextSkip = (decoded?.skip || 0) + items.length;
  return sendSuccess(res, {
    data: {
      items,
      nextCursor: nextSkip < total ? encodeCursor({ skip: nextSkip }) : null,
      hasMore: nextSkip < total,
      total,
    },
  });
});

module.exports = { list };
