// server/app/controllers/subscription.controller.js
//
// Subscription + FeatureFlag endpoints combined in one controller: both are
// small, both are read-mostly for the Android client, and both are always
// fetched together right after login in practice. C.5 / C.6.

const subscriptionService = require('../services/subscription.service');
const featureFlagService = require('../services/featureFlag.service');
const superAdminService = require('../services/superAdmin.service');
const { sendSuccess, asyncHandler } = require('../utils');

// --- Restaurant-scoped (own subscription/flags) ---

const getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getEffectiveStatus(req.tenant.restaurantId);
  return sendSuccess(res, { data: subscription });
});

const getMyFeatureFlags = asyncHandler(async (req, res) => {
  const flags = await featureFlagService.getFlagsForRestaurant(req.tenant.restaurantId);
  return sendSuccess(res, { data: flags });
});

const setMyFeatureFlag = asyncHandler(async (req, res) => {
  const flags = await featureFlagService.setFlag(req.tenant.restaurantId, req.body.key, req.body.value, req.tenant);
  return sendSuccess(res, { data: flags });
});

// --- Super Admin (any restaurant, via path param) ---

const getSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getEffectiveStatus(req.params.restaurantId);
  return sendSuccess(res, { data: subscription });
});

const changePlan = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const subscription = await subscriptionService.changePlan(req.params.restaurantId, req.body, actor);
  return sendSuccess(res, { data: subscription });
});

const renew = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const subscription = await subscriptionService.renewSubscription(req.params.restaurantId, req.body, actor);
  return sendSuccess(res, { data: subscription });
});

const suspend = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const subscription = await subscriptionService.suspendSubscription(req.params.restaurantId, actor);
  return sendSuccess(res, { data: subscription });
});

const getFeatureFlags = asyncHandler(async (req, res) => {
  const flags = await featureFlagService.getFlagsForRestaurant(req.params.restaurantId);
  return sendSuccess(res, { data: flags });
});

const setFeatureFlag = asyncHandler(async (req, res) => {
  const actor = await superAdminService.buildActorContext(req);
  const flags = await featureFlagService.setFlag(req.params.restaurantId, req.body.key, req.body.value, actor);
  return sendSuccess(res, { data: flags });
});

module.exports = {
  getMySubscription,
  getMyFeatureFlags,
  setMyFeatureFlag,
  getSubscription,
  changePlan,
  renew,
  suspend,
  getFeatureFlags,
  setFeatureFlag,
};
