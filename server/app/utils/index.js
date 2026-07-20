// server/app/utils/index.js
//
// Small, cross-cutting helpers consolidated into one file rather than
// one-function-per-file, per project convention: split files by genuine
// separation of concern, not by line count.

const crypto = require('crypto');

/**
 * B.12 API Foundation — Standard Response Format.
 * Every controller responds through these two helpers ONLY, so every
 * endpoint's shape is identical for clients (Android POS, Web POS, Super
 * Admin) to rely on.
 *
 * Success:
 *   { success: true, data: {...}, error: null, meta: { requestId, serverTime } }
 * Error:
 *   { success: false, data: null, error: { code, message, details? }, meta: {...} }
 */
function sendSuccess(res, { data = null, statusCode = 200, meta = {} } = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    meta: { requestId: res.locals.requestId, serverTime: new Date().toISOString(), ...meta },
  });
}

function sendError(res, { statusCode = 500, code = 'INTERNAL_ERROR', message = 'Something went wrong.', details = undefined } = {}) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { code, message, ...(details ? { details } : {}) },
    meta: { requestId: res.locals.requestId, serverTime: new Date().toISOString() },
  });
}

/**
 * Wraps an async Express route handler so a rejected promise is forwarded
 * to `next(err)` instead of crashing the process — every controller method
 * is wrapped in this, so no controller needs its own try/catch for routing
 * purposes (the global error handler in middleware/errorHandler.js takes it
 * from there).
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Short random id for request tracing (B.15), independent of any DB id. */
function generateRequestId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * B.12 — Pagination Strategy: cursor-based, matching the Android client's
 * expectations (docs/API_STANDARDS.md). Encodes/decodes an opaque cursor
 * around a Mongo ObjectId + createdAt so lists stay stable even as rows are
 * added/removed between fetches.
 */
function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  sendSuccess,
  sendError,
  asyncHandler,
  generateRequestId,
  encodeCursor,
  decodeCursor,
};
