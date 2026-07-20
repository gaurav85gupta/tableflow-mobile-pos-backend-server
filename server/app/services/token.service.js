// server/app/services/token.service.js
//
// B.5 Authentication Foundation.
// Small enough to be one file: generating and verifying both access and
// refresh JWTs is a single cohesive concern (token lifecycle), not two.

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');

function signAccessToken({ userId, restaurantId, deviceId, role }) {
  return jwt.sign(
    { sub: userId, restaurantId, deviceId, role, type: 'access' },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  );
}

/**
 * Refresh tokens are opaque random strings, NOT JWTs — they carry no claims
 * of their own. The server looks them up in the sessions collection (see
 * session.repository.js) to resolve who they belong to, which is what makes
 * server-side revocation ("log out this one device") possible. A JWT
 * refresh token would be valid until expiry no matter what the server does.
 */
function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function refreshTokenExpiryDate() {
  const match = /^(\d+)d$/.exec(config.jwt.refreshExpiresIn);
  const days = match ? parseInt(match[1], 10) : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret); // throws JsonWebTokenError / TokenExpiredError on failure
}

module.exports = {
  signAccessToken,
  generateRefreshToken,
  refreshTokenExpiryDate,
  verifyAccessToken,
};
