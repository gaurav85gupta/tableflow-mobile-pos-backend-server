// server/app/repositories/session.repository.js

const crypto = require('crypto');
const Session = require('../models/session.model');

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function create({ restaurantId, userId, deviceId, refreshToken, expiresAt, userAgent, ipAddress }) {
  return Session.create({
    restaurantId,
    userId,
    deviceId,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
    userAgent,
    ipAddress,
  });
}

async function findValidByToken(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  const session = await Session.findOne({ refreshTokenHash: tokenHash }).select('+refreshTokenHash');
  if (!session || !session.isValid()) return null;
  return session;
}

async function revoke(sessionId) {
  return Session.findByIdAndUpdate(sessionId, { revokedAt: new Date() });
}

async function revokeAllForUser(userId) {
  return Session.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
}

module.exports = { create, findValidByToken, revoke, revokeAllForUser, hashToken };
