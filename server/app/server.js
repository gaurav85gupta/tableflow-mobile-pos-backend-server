// server/app/server.js
//
// B.1 Backend Project Initialization — process entry point.
// Responsible for: connecting to MongoDB before accepting traffic, starting
// the HTTP server, starting background jobs, and shutting down cleanly on
// SIGTERM/SIGINT (important for zero-downtime deploys) and on truly
// unexpected errors (uncaughtException / unhandledRejection) rather than
// leaving the process in an unknown state.

const config = require('./config/env');
const logger = require('./config/logger');
const createApp = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { startBackgroundJobs } = require('./jobs');

const log = logger.category(logger.CATEGORIES.GENERAL);

let httpServer;

async function start() {
  await connectDatabase();

  const app = createApp();
  httpServer = app.listen(config.port, () => {
    log.info(`TableFlow server listening`, { port: config.port, env: config.nodeEnv, apiVersion: config.apiVersion });
  });

  startBackgroundJobs();
}

async function shutdown(signal) {
  log.info(`Received ${signal}, shutting down gracefully`);
  if (httpServer) {
    httpServer.close(async () => {
      await disconnectDatabase();
      log.info('Shutdown complete');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection', { reason: reason instanceof Error ? reason.stack : reason });
});

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception — exiting', { error: err.stack });
  process.exit(1);
});

start().catch((err) => {
  log.error('Failed to start server', { error: err.stack });
  process.exit(1);
});
