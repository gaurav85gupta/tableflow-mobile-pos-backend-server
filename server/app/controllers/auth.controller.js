// server/app/controllers/auth.controller.js
//
// B.2 rule: "Business logic controllers mein nahi hogi; controllers sirf
// request/response handle karenge." Every method here does exactly three
// things: pull data off req, call a service, send the response.

const authenticationService = require('../services/authentication.service');
const { sendSuccess } = require('../utils');
const { asyncHandler } = require('../utils');

const login = asyncHandler(async (req, res) => {
  const result = await authenticationService.login({
    ...req.body,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  return sendSuccess(res, { data: result });
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authenticationService.refreshAccessToken(req.body.refreshToken);
  return sendSuccess(res, { data: result });
});

const logout = asyncHandler(async (req, res) => {
  await authenticationService.logout(req.body.refreshToken);
  return sendSuccess(res, { data: { loggedOut: true } });
});

module.exports = { login, refresh, logout };
