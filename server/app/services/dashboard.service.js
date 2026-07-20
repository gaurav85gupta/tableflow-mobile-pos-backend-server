// server/app/services/dashboard.service.js
//
// C.2 Super Admin Dashboard. One function, `getDashboardSummary`, that
// fires all the widget queries in parallel and returns a single flat
// payload -- the frontend renders one screen from one API call rather than
// 7 separate requests on page load.

const restaurantRepository = require('../repositories/restaurant.repository');
const deviceRepository = require('../repositories/device.repository');
const subscriptionRepository = require('../repositories/subscription.repository');
const activityLogService = require('./activityLog.service');

const EXPIRING_SOON_WINDOW_DAYS = 7;
const RECENT_ACTIVITY_COUNT = 10;

async function getDashboardSummary() {
  const [restaurantCounts, totalDevices, activeSubscriptions, expiringSubscriptions, recentActivity] = await Promise.all([
    restaurantRepository.countsByStatus(),
    deviceRepository.countAll(),
    subscriptionRepository.countActive(),
    subscriptionRepository.findExpiringSoon(EXPIRING_SOON_WINDOW_DAYS),
    activityLogService.listRecent(RECENT_ACTIVITY_COUNT),
  ]);

  return {
    totalRestaurants: restaurantCounts.total,
    activeRestaurants: restaurantCounts.active,
    suspendedRestaurants: restaurantCounts.suspended,
    archivedRestaurants: restaurantCounts.archived,
    totalDevices,
    activeSubscriptions,
    expiringSubscriptions: expiringSubscriptions.map((s) => ({
      restaurantId: s.restaurantId?._id,
      restaurantName: s.restaurantId?.name,
      restaurantCode: s.restaurantId?.restaurantCode,
      plan: s.plan,
      expiresAt: s.expiresAt,
    })),
    recentActivity,
  };
}

module.exports = { getDashboardSummary };
