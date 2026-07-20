// server/app/middleware/auth.middleware.js
//
// B.14 Middleware Foundation — Authentication + Authorization.
// Combined in one file deliberately: "is this request authenticated" and
// "is this authenticated user allowed to do this" are two tiny, sequential
// checks on the same req.auth object, always used together, never one
// without the other in practice.
//
// IMPORTANT: this middleware does NOT resolve tenant context beyond
// attaching the raw JWT claims to req.auth. The actual "does this
// restaurant still exist / is it active" check happens in
// tenant.middleware.js, which runs after this one — see B.6 note there on
// why that's a separate step from token verification.

const tokenService = require('../services/token.service');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.SECURITY);

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/** Verifies the access JWT and attaches its claims to req.auth. */
function authenticate(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return next(AppError.unauthorized('Missing or malformed Authorization header.'));
  }

  try {
    const claims = tokenService.verifyAccessToken(token);
    req.auth = {
      userId: claims.sub,
      restaurantId: claims.restaurantId,
      deviceId: claims.deviceId,
      role: claims.role,
    };
    return next();
  } catch (err) {
    log.warn('Access token rejected', { reason: err.name });
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Session expired. Please log in again.'));
    }
    return next(AppError.unauthorized('Invalid access token.'));
  }
}

/** Usage: router.post('/restaurants', authenticate, requireRole('super_admin'), ...) */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) return next(AppError.unauthorized());
    if (!allowedRoles.includes(req.auth.role)) {
      log.warn('Authorization denied', { userId: req.auth.userId, role: req.auth.role, allowedRoles });
      return next(AppError.forbidden());
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
