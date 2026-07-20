// server/app/middleware/requestLogger.middleware.js
//
// B.14 Middleware Foundation — Request Logging.
// Also assigns the requestId used throughout utils/index.js's response
// envelopes, so a client-reported requestId can be grepped straight to its
// server-side log line.

const { generateRequestId } = require('../utils');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.API);

function requestLogger(req, res, next) {
  res.locals.requestId = generateRequestId();
  const startedAt = Date.now();

  res.on('finish', () => {
    log.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      requestId: res.locals.requestId,
      durationMs: Date.now() - startedAt,
      restaurantId: req.tenant ? req.tenant.restaurantId : undefined,
    });
  });

  next();
}

module.exports = requestLogger;
