// server/app/app.js
//
// B.1 Backend Project Initialization / B.14 Middleware Foundation.
// Assembles the Express app and its middleware pipeline, in an order that
// matters:
//   1. Security headers + CORS (reject/tag bad requests before anything else runs)
//   2. Body parsing + sanitization (never trust raw input past this point)
//   3. Compression + request logging
//   4. General rate limiting
//   5. Versioned routes (/api/v1/...)
//   6. 404 handler
//   7. Global error handler (MUST be registered last)
//
// This file only wires things together — it contains no business logic and
// no route definitions of its own.

const express = require('express');
const compression = require('compression');
const config = require('./config/env');
const routes = require('./routes');
const {
  helmetMiddleware,
  corsMiddleware,
  rateLimiter,
  sanitizeMiddleware,
} = require('./middleware/security.middleware');
const requestLogger = require('./middleware/requestLogger.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // needed for req.ip to be correct behind a load balancer, and for rate-limit to key on real client IP

  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(sanitizeMiddleware);

  app.use(compression());
  app.use(requestLogger);
  app.use(rateLimiter);

  app.use(`/api/${config.apiVersion}`, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
