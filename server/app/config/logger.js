// server/app/config/logger.js
//
// B.15 Logging & Monitoring.
//
// A single Winston instance shared by the whole app, with a `category()`
// helper so every log line is tagged (authentication / api / database /
// security / sync) the same way the Android client's TableFlowLogger tags
// its categories — this keeps server + client logs greppable with the same
// mental model.
//
// In development: colorized console output.
// In production/staging: JSON lines (so they're ingestible by any log
// aggregator) plus daily-rotating file output.

const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('./env');

const { combine, timestamp, printf, colorize, json } = winston.format;

const CATEGORIES = Object.freeze({
  AUTH: 'authentication',
  API: 'api',
  DATABASE: 'database',
  SECURITY: 'security',
  SYNC: 'sync',
  GENERAL: 'general',
});

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, category, ...meta }) => {
    const cat = category ? `[${category}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} ${level} ${cat} ${message}${metaStr}`;
  }),
);

const prodFormat = combine(timestamp(), json());

const transports = [new winston.transports.Console()];

if (!config.isTest) {
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: 'tableflow-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: prodFormat,
    }),
  );
}

const baseLogger = winston.createLogger({
  level: config.logging.level,
  format: config.isDevelopment ? devFormat : prodFormat,
  transports,
  silent: config.isTest,
});

/**
 * Returns a child logger pre-tagged with a category, e.g.:
 *   const log = logger.category(logger.CATEGORIES.SYNC);
 *   log.info('Drained 4 queued changes', { restaurantId });
 */
function category(categoryName) {
  return {
    debug: (message, meta) => baseLogger.debug(message, { category: categoryName, ...meta }),
    info: (message, meta) => baseLogger.info(message, { category: categoryName, ...meta }),
    warn: (message, meta) => baseLogger.warn(message, { category: categoryName, ...meta }),
    error: (message, meta) => baseLogger.error(message, { category: categoryName, ...meta }),
  };
}

module.exports = {
  ...baseLogger,
  category,
  CATEGORIES,
};
