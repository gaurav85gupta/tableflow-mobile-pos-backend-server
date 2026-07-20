// server/app/config/database.js
//
// B.3 Database Foundation.
//
// Single Mongoose connection, with the connection lifecycle logged under
// the DATABASE category. Kept separate from env.js because "how we connect"
// (retry behavior, event listeners) is a different concern from "what the
// connection string is."

const mongoose = require('mongoose');
const config = require('./env');
const logger = require('./logger');

const log = logger.category(logger.CATEGORIES.DATABASE);

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    log.info('MongoDB connection established');
  });

  mongoose.connection.on('error', (err) => {
    log.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    log.warn('MongoDB disconnected');
  });

  await mongoose.connect(config.mongo.uri, {
    autoIndex: !config.isProduction, // build indexes automatically outside prod; run explicit migrations in prod
  });

  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
