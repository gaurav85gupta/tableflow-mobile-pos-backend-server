// server/app/controllers/health.controller.js
//
// B.1 Backend Project Initialization — /health endpoint.

const mongoose = require('mongoose');
const { sendSuccess } = require('../utils');
const config = require('../config/env');

const MONGOOSE_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

function check(req, res) {
  const dbState = MONGOOSE_STATES[mongoose.connection.readyState] || 'unknown';
  return sendSuccess(res, {
    data: {
      status: 'ok',
      environment: config.nodeEnv,
      apiVersion: config.apiVersion,
      database: dbState,
      uptimeSeconds: Math.floor(process.uptime()),
    },
  });
}

module.exports = { check };
