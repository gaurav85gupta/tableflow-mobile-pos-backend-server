// server/app/middleware/errorHandler.middleware.js
//
// B.14 Middleware Foundation / B.17 Error Handling.
// The LAST middleware registered in server.js. Every error in the app —
// AppError thrown deliberately, a Mongoose validation error, a JWT error
// that slipped through, or a genuine bug — ends up here and is turned into
// the same standard envelope shape (utils/index.js `sendError`), so no
// client ever has to special-case a raw stack trace or an HTML error page.

const AppError = require('../utils/AppError');
const { sendError } = require('../utils');
const { ERROR_CODES } = require('../config/constants');
const logger = require('../config/logger');
const config = require('../config/env');

const log = logger.category(logger.CATEGORIES.API);

function mapKnownErrorTypes(err) {
  if (err instanceof AppError) return err;

  if (err.name === 'ValidationError' && err.errors) {
    // Mongoose schema validation error.
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return AppError.badRequest('Validation failed.', details);
  }

  if (err.code === 11000) {
    // Mongo duplicate key error.
    return new AppError('A record with this value already exists.', { statusCode: 409, code: ERROR_CODES.CONFLICT });
  }

  if (err.name === 'CastError') {
    return AppError.badRequest(`Invalid value for field "${err.path}".`);
  }

  return new AppError(
    config.isProduction ? 'Something went wrong. Please try again.' : err.message,
    { statusCode: 500, code: ERROR_CODES.INTERNAL_ERROR, isOperational: false },
  );
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const appError = mapKnownErrorTypes(err);

  if (!appError.isOperational) {
    log.error(appError.message, { requestId: res.locals.requestId, stack: err.stack });
  } else {
    log.warn(appError.message, { requestId: res.locals.requestId, code: appError.code });
  }

  return sendError(res, {
    statusCode: appError.statusCode,
    code: appError.code,
    message: appError.message,
    details: appError.details,
  });
}

function notFoundHandler(req, res) {
  return sendError(res, {
    statusCode: 404,
    code: ERROR_CODES.NOT_FOUND,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
