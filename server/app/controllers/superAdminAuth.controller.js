// server/app/controllers/superAdminAuth.controller.js
//
// C.1 Super Admin Authentication. Thin, per B.2's rule -- all logic in
// authentication.service.js.

const authenticationService = require('../services/authentication.service');
const { sendSuccess, asyncHandler } = require('../utils');

const login = asyncHandler(async (req, res) => {
  const result = await authenticationService.superAdminLogin({ ...req.body, ipAddress: req.ip });
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

/**
 * C.1 -- Auto Session Restore. The frontend calls this with a valid access
 * token on app load to confirm the session is still good and fetch the
 * current admin's profile, instead of decoding the JWT client-side (which
 * can't tell you if the account was deactivated after the token was issued).
 */
const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: { id: req.auth.userId, role: req.auth.role } });
});

const changePassword = asyncHandler(async (req, res) => {
  await authenticationService.changeSuperAdminPassword(req.auth.userId, req.body);
  return sendSuccess(res, { data: { changed: true } });
});

module.exports = { login, refresh, logout, me, changePassword };
