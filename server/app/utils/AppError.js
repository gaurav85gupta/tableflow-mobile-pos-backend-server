// server/app/utils/AppError.js
//
// B.17 Error Handling.
//
// A single custom Error subclass every Service/Repository throws instead of
// a raw Error or a Mongoose exception. The global error handler middleware
// (middleware/errorHandler.js) knows how to turn this into the standard API
// error envelope; anything that ISN'T an AppError is treated as an
// unexpected 500 and logged loudly, so this class is also how the team
// notices "oh, I forgot to handle this case explicitly."

const { ERROR_CODES } = require('../config/constants');

class AppError extends Error {
  constructor(message, { statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR, details = undefined, isOperational = true } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational; // true = expected/handled failure, false = programmer error
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new AppError(message, { statusCode: 400, code: ERROR_CODES.VALIDATION_ERROR, details });
  }

  static unauthorized(message = 'Authentication required.') {
    return new AppError(message, { statusCode: 401, code: ERROR_CODES.UNAUTHORIZED });
  }

  static forbidden(message = 'You do not have permission to perform this action.') {
    return new AppError(message, { statusCode: 403, code: ERROR_CODES.FORBIDDEN });
  }

  static notFound(message = 'Resource not found.') {
    return new AppError(message, { statusCode: 404, code: ERROR_CODES.NOT_FOUND });
  }

  static conflict(message = 'This action conflicts with existing data.') {
    return new AppError(message, { statusCode: 409, code: ERROR_CODES.CONFLICT });
  }

  static tenantMismatch(message = 'This resource does not belong to your restaurant.') {
    return new AppError(message, { statusCode: 403, code: ERROR_CODES.TENANT_MISMATCH });
  }

  static invalidCredentials(message = 'Incorrect restaurant code, username, or password.') {
    return new AppError(message, { statusCode: 401, code: ERROR_CODES.INVALID_CREDENTIALS });
  }
}

module.exports = AppError;
