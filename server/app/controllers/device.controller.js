// server/app/controllers/device.controller.js
//
// Restaurant-scoped device viewing (read-only for the restaurant's own
// owner/manager -- approve/disable/remove are Super Admin-only actions, see
// superAdminDevice.controller.js, per C.8's action list being reserved for
// platform-level control).

const deviceService = require('../services/device.service');
const { sendSuccess, asyncHandler } = require('../utils');

const list = asyncHandler(async (req, res) => {
  const { items, total } = await deviceService.listDevices(req.tenant.restaurantId, req.query);
  return sendSuccess(res, { data: { items, total } });
});

const getById = asyncHandler(async (req, res) => {
  const device = await deviceService.getDeviceById(req.tenant.restaurantId, req.params.deviceId);
  return sendSuccess(res, { data: device });
});

module.exports = { list, getById };
