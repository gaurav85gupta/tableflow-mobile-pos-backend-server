// server/app/controllers/dashboard.controller.js
//
// C.2 Super Admin Dashboard.

const dashboardService = require('../services/dashboard.service');
const { sendSuccess, asyncHandler } = require('../utils');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getDashboardSummary();
  return sendSuccess(res, { data: summary });
});

module.exports = { getSummary };
