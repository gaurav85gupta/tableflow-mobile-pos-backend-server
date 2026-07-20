// server/app/services/superAdmin.service.js
//
// Thin lookup service so controllers can resolve a friendly display name
// for activity-log "actorLabel" fields without every controller reaching
// into superAdminRepository directly.

const superAdminRepository = require('../repositories/superAdmin.repository');
const AppError = require('../utils/AppError');

async function getProfile(adminId) {
  const admin = await superAdminRepository.findById(adminId);
  if (!admin) throw AppError.notFound('Admin account not found.');
  return admin;
}

/** Builds the `actor` object every activity-log-writing service expects: { userId, role, label }. */
async function buildActorContext(req) {
  if (req.auth.role !== 'super_admin') {
    return { userId: req.auth.userId, role: req.auth.role, label: undefined };
  }
  try {
    const admin = await getProfile(req.auth.userId);
    return { userId: req.auth.userId, role: 'super_admin', label: admin.name };
  } catch {
    return { userId: req.auth.userId, role: 'super_admin', label: undefined };
  }
}

module.exports = { getProfile, buildActorContext };
