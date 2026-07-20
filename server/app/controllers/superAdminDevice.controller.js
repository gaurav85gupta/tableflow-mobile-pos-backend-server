// server/app/controllers/superAdminDevice.controller.js
//
// C.8 Device Management -- Approve / Disable / Remove, Super Admin only,
// cross-restaurant.

const deviceService = require('../services/device.service');
const superAdminService = require('../services/superAdmin.service');
const { sendSuccess, asyncHandler } = require('../utils');

const list = asyncHandler(async (req, res) => {
  const { items, total } = await deviceService.listAllDevices(req.query);
  return sendSuccess(res, { data: { items, total } });
});

const approve = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const device = await deviceService.approveDevice(req.params.deviceId, actor);
  return sendSuccess(res, { data: device });
});

const disable = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const device = await deviceService.disableDevice(req.params.deviceId, actor);
  return sendSuccess(res, { data: device });
});

const remove = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const device = await deviceService.removeDevice(req.params.deviceId, actor);
  return sendSuccess(res, { data: device });
});

module.exports = { list, approve, disable, remove };
