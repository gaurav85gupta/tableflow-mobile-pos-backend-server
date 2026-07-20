// server/app/superadmin/superadmin.routes.js
//
// Routes for the Super Admin Website (Phase C). Every route below requires
// `Authorization: Bearer <accessToken>` where the token's role is
// 'super_admin' -- provisioned via the seed script (scripts/seedSuperAdmin.js),
// not through any public signup endpoint.

const express = require('express');
const restaurantController = require('../controllers/restaurant.controller');
const subscriptionController = require('../controllers/subscription.controller');
const superAdminUserController = require('../controllers/superAdminUser.controller');
const superAdminDeviceController = require('../controllers/superAdminDevice.controller');
const dashboardController = require('../controllers/dashboard.controller');
const activityLogController = require('../controllers/activityLog.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const restaurantValidator = require('../validators/restaurant.validator');
const restaurantConfigValidator = require('../validators/restaurantConfig.validator');
const subscriptionValidator = require('../validators/subscription.validator');
const userValidator = require('../validators/user.validator');
const deviceValidator = require('../validators/device.validator');

const router = express.Router();

router.use(authenticate, requireRole('super_admin'));

// C.2 Super Admin Dashboard
router.get('/dashboard', dashboardController.getSummary);

// C.3 Restaurant Management
router.post('/restaurants', validate(restaurantValidator.createRestaurant), restaurantController.create);
router.get('/restaurants', validate(restaurantValidator.listRestaurants, 'query'), restaurantController.list);
router.get('/restaurants/:restaurantId', validate(restaurantValidator.restaurantIdParam, 'params'), restaurantController.getById);
router.put('/restaurants/:restaurantId', validate(restaurantValidator.restaurantIdParam, 'params'), validate(restaurantValidator.updateRestaurant), restaurantController.update);
router.post('/restaurants/:restaurantId/activate', validate(restaurantValidator.restaurantIdParam, 'params'), restaurantController.activate);
router.post('/restaurants/:restaurantId/suspend', validate(restaurantValidator.restaurantIdParam, 'params'), restaurantController.suspend);
router.post('/restaurants/:restaurantId/archive', validate(restaurantValidator.restaurantIdParam, 'params'), restaurantController.archive);

// C.4 Restaurant Configuration
router.get('/restaurants/:restaurantId/config', validate(restaurantValidator.restaurantIdParam, 'params'), restaurantController.getConfig);
router.put('/restaurants/:restaurantId/config', validate(restaurantValidator.restaurantIdParam, 'params'), validate(restaurantConfigValidator.updateConfig), restaurantController.updateConfig);

// C.5 Subscription Management
router.get('/restaurants/:restaurantId/subscription', validate(restaurantValidator.restaurantIdParam, 'params'), subscriptionController.getSubscription);
router.put('/restaurants/:restaurantId/subscription', validate(restaurantValidator.restaurantIdParam, 'params'), validate(subscriptionValidator.changePlan), subscriptionController.changePlan);
router.post('/restaurants/:restaurantId/subscription/renew', validate(restaurantValidator.restaurantIdParam, 'params'), validate(subscriptionValidator.renew), subscriptionController.renew);
router.post('/restaurants/:restaurantId/subscription/suspend', validate(restaurantValidator.restaurantIdParam, 'params'), subscriptionController.suspend);

// C.6 Feature Flag Management
router.get('/restaurants/:restaurantId/feature-flags', validate(restaurantValidator.restaurantIdParam, 'params'), subscriptionController.getFeatureFlags);
router.put('/restaurants/:restaurantId/feature-flags', validate(restaurantValidator.restaurantIdParam, 'params'), validate(subscriptionValidator.setFeatureFlag), subscriptionController.setFeatureFlag);

// C.7 User Management (any restaurant's users)
router.post('/restaurants/:restaurantId/users', validate(restaurantValidator.restaurantIdParam, 'params'), validate(userValidator.createUser), superAdminUserController.create);
router.get('/restaurants/:restaurantId/users', validate(restaurantValidator.restaurantIdParam, 'params'), superAdminUserController.list);
router.put('/restaurants/:restaurantId/users/:userId', validate(restaurantValidator.restaurantIdParam, 'params'), validate(userValidator.userIdParam, 'params'), validate(userValidator.updateUser), superAdminUserController.update);
router.post('/restaurants/:restaurantId/users/:userId/disable', validate(restaurantValidator.restaurantIdParam, 'params'), validate(userValidator.userIdParam, 'params'), superAdminUserController.deactivate);
router.post('/restaurants/:restaurantId/users/:userId/enable', validate(restaurantValidator.restaurantIdParam, 'params'), validate(userValidator.userIdParam, 'params'), superAdminUserController.reactivate);

// C.8 Device Management (all restaurants)
router.get('/devices', superAdminDeviceController.list);
router.post('/devices/:deviceId/approve', validate(deviceValidator.deviceIdParam, 'params'), superAdminDeviceController.approve);
router.post('/devices/:deviceId/disable', validate(deviceValidator.deviceIdParam, 'params'), superAdminDeviceController.disable);
router.post('/devices/:deviceId/remove', validate(deviceValidator.deviceIdParam, 'params'), superAdminDeviceController.remove);

// C.9 Activity Logs
router.get('/activity-logs', activityLogController.list);

module.exports = router;
