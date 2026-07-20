// server/app/middleware/tenant.middleware.js
//
// B.6 Multi-Tenant Foundation — "sabse critical phase."
//
// Runs immediately after auth.middleware.js's `authenticate`. Its entire
// job is to make the following guarantee true for every route that uses it:
//
//   The restaurantId a request operates on is ALWAYS the one embedded in
//   the verified JWT (req.auth.restaurantId) — NEVER a restaurantId read
//   from req.body, req.query, or req.params.
//
// Concretely: controllers must never do `const { restaurantId } = req.body`
// and pass that into a service. They call `req.tenant.restaurantId`
// instead, which this middleware sets only after confirming the restaurant
// still exists and is active. This is what "server kabhi bhi client ke
// bheje restaurantId ko blindly trust nahi karega" means in code.
//
// It also opportunistically touches the device's lastSeenAt (B.9) here,
// since every authenticated request already proves the device is alive —
// no extra client-side heartbeat call needed.

const restaurantService = require('../services/restaurant.service');
const deviceService = require('../services/device.service');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.SECURITY);

async function resolveTenant(req, res, next) {
  if (!req.auth || !req.auth.restaurantId) {
    return next(AppError.unauthorized());
  }

  try {
    const restaurant = await restaurantService.assertRestaurantActiveOrThrow(req.auth.restaurantId);

    req.tenant = {
      restaurantId: String(restaurant._id),
      userId: req.auth.userId,
      deviceId: req.auth.deviceId,
      role: req.auth.role,
    };

    // Fire-and-forget: don't let a slow/failed lastSeen write block the request.
    if (req.auth.deviceId) {
      deviceService.touchLastSeen(req.auth.deviceId).catch((err) => {
        log.warn('Failed to update device lastSeenAt', { deviceId: req.auth.deviceId, error: err.message });
      });
    }

    return next();
  } catch (err) {
    log.warn('Tenant resolution failed', { restaurantId: req.auth.restaurantId, error: err.message });
    return next(err);
  }
}

/**
 * Defense-in-depth guard for any route/service that still receives a
 * restaurantId-shaped value from client input (e.g. a path param on a
 * Super Admin route that manages a DIFFERENT restaurant than the caller's
 * own). Confirms the two match, or throws TENANT_MISMATCH. Regular
 * restaurant-scoped routes should not need this — they simply never read
 * restaurantId from anywhere but req.tenant in the first place.
 */
function assertMatchesTenant(req, candidateRestaurantId) {
  if (String(req.tenant.restaurantId) !== String(candidateRestaurantId)) {
    throw AppError.tenantMismatch();
  }
}

module.exports = { resolveTenant, assertMatchesTenant };
