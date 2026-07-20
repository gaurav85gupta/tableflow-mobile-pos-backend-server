// server/app/config/env.js
//
// B.4 Configuration Management.
//
// The ONLY file in the codebase allowed to read `process.env` directly.
// Every other file imports `config` from here — this is what makes
// Development / Staging / Production behave consistently and makes a
// missing/misconfigured env var fail loudly at boot instead of silently
// deep inside some unrelated request handler.
//
// Secrets live only in environment variables (never hardcoded, never
// committed) — see .env.example for the full list expected.

require('dotenv').config();

function required(name, fallbackForDev) {
  const value = process.env[name];
  if (value !== undefined && value !== '') return value;
  if (process.env.NODE_ENV !== 'production' && fallbackForDev !== undefined) {
    return fallbackForDev;
  }
  throw new Error(`Missing required environment variable: ${name}`);
}

const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isStaging: nodeEnv === 'staging',
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',

  port: parseInt(process.env.PORT || '4000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  mongo: {
    uri: required('MONGO_URI', 'mongodb://localhost:27017/tableflow_dev'),
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-only-access-secret-do-not-use-in-prod'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-do-not-use-in-prod'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
  },
};

// Fail fast in production if secrets were left at dev defaults.
if (config.isProduction) {
  if (config.jwt.accessSecret.startsWith('dev-only') || config.jwt.refreshSecret.startsWith('dev-only')) {
    throw new Error('Refusing to start in production with default JWT secrets. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.');
  }
}

module.exports = config;
