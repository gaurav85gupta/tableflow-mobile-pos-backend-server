// server/app/repositories/superAdmin.repository.js

const SuperAdmin = require('../models/superAdmin.model');

async function findByEmailWithPassword(email) {
  return SuperAdmin.findOne({ email: email.toLowerCase() }).select('+passwordHash');
}

async function findById(id) {
  return SuperAdmin.findById(id);
}

async function findByIdWithPassword(id) {
  return SuperAdmin.findById(id).select('+passwordHash');
}

async function create(data) {
  return SuperAdmin.create(data);
}

module.exports = { findByEmailWithPassword, findById, findByIdWithPassword, create };
