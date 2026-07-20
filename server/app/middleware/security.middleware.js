// server/app/middleware/security.middleware.js
//
// B.16 Security Foundation.
// All app-wide security middleware configured together in one file since
// they're all applied at the same point in server.js's setup, in a specific
// order that matters (helmet/cors first, rate-limit and sanitize after) —
// keeping them together makes that ordering visible in one place.

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('../config/env');
const { sendError } = require('../utils');
const { ERROR_CODES } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.SECURITY);

const helmetMiddleware = helmet();

const corsMiddleware = cors({
  origin(origin, callback) {
    // Allow same-origin/non-browser requests (no Origin header, e.g. the
    // Android app's HTTP client) through; browsers get checked against the
    // allowlist.
    if (!origin || config.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    log.warn('CORS rejected origin', { origin });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
});

const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    log.warn('Rate limit exceeded', { ip: req.ip, path: req.originalUrl });
    sendError(res, { statusCode: 429, code: ERROR_CODES.RATE_LIMITED, message: 'Too many requests. Please try again later.' });
  },
});

// Stricter limiter specifically for login, since credential-stuffing
// attempts target that one endpoint far more than the API in general.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    log.warn('Login rate limit exceeded', { ip: req.ip });
    sendError(res, { statusCode: 429, code: ERROR_CODES.RATE_LIMITED, message: 'Too many login attempts. Please try again later.' });
  },
});

const sanitizeMiddleware = mongoSanitize(); // strips $/. keys from req.body/query/params — prevents Mongo operator injection

module.exports = {
  helmetMiddleware,
  corsMiddleware,
  rateLimiter,
  loginRateLimiter,
  sanitizeMiddleware,
};
