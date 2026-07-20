// server/app/restaurant/restaurant.routes.js
//
// Every route in this file is scoped to "the restaurant the caller's JWT
// belongs to" via tenant.middleware.js -- none of them accept a
// restaurantId from the client. This is the route group the Android POS
// app (and future Web POS) actually calls day-to-day, as opposed to
// superadmin.routes.js which the Super Admin Website calls.

const express = require('express');
const userController = require('../controllers/user.controller');
const deviceController = require('../controllers/device.controller');
const subscriptionController = require('../controllers/subscription.controller');
const restaurantController = require('../controllers/restaurant.controller');
const categoryController = require('../controllers/category.controller');
const menuItemController = require('../controllers/menuItem.controller');
const orderController = require('../controllers/order.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const userValidator = require('../validators/user.validator');
const deviceValidator = require('../validators/device.validator');
const subscriptionValidator = require('../validators/subscription.validator');
const menuValidator = require('../validators/menu.validator');
const orderValidator = require('../validators/order.validator');
const { USER_ROLES } = require('../config/constants');

const router = express.Router();

// Every route below requires: valid access token -> active, resolved tenant.
router.use(authenticate, resolveTenant);

// B.8 / C.7 User Management (owner/manager only -- a cashier shouldn't create/edit logins)
router.post('/users', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(userValidator.createUser), userController.create);
router.get('/users', userController.list);
router.get('/users/:userId', validate(userValidator.userIdParam, 'params'), userController.getById);
router.put('/users/:userId', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(userValidator.userIdParam, 'params'), validate(userValidator.updateUser), userController.update);
router.post('/users/:userId/deactivate', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(userValidator.userIdParam, 'params'), userController.deactivate);
router.post('/users/:userId/reactivate', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(userValidator.userIdParam, 'params'), userController.reactivate);

// B.9 Device Management Foundation -- read-only here; approve/disable/remove are Super Admin actions (C.8)
router.get('/devices', deviceController.list);
router.get('/devices/:deviceId', validate(deviceValidator.deviceIdParam, 'params'), deviceController.getById);

// B.10 / C.5 -- read own subscription (fetched right after login by the app)
router.get('/subscription', subscriptionController.getMySubscription);

// B.11 / C.6 -- read own feature flags; owners can also turn OFF a flag they don't want (never ON beyond plan entitlement)
router.get('/feature-flags', subscriptionController.getMyFeatureFlags);
router.put('/feature-flags', requireRole(USER_ROLES.OWNER), validate(subscriptionValidator.setFeatureFlag), subscriptionController.setMyFeatureFlag);

// C.4 -- read own configuration (Android app's first-sync download)
router.get('/config', (req, res, next) => {
  req.params.restaurantId = req.tenant.restaurantId;
  next();
}, restaurantController.getConfig);

// G.2 Categories (owner/manager manage; any authenticated role can read, since Counter -- a cashier's screen -- needs to read categories too)
router.post('/categories', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(menuValidator.createCategory), categoryController.create);
router.get('/categories', categoryController.list);
router.put('/categories/:categoryId', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(menuValidator.categoryIdParam, 'params'), validate(menuValidator.updateCategory), categoryController.update);
router.post('/categories/:categoryId/enabled', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(menuValidator.categoryIdParam, 'params'), validate(menuValidator.setCategoryEnabled), categoryController.setEnabled);
router.delete('/categories/:categoryId', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(menuValidator.categoryIdParam, 'params'), categoryController.archive);

// G.3/G.4/G.5/G.16 Menu Items
router.post('/menu-items', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(menuValidator.createMenuItem), menuItemController.create);
router.get('/menu-items', validate(menuValidator.listMenuItemsQuery, 'query'), menuItemController.list);
router.get('/menu-items/search', validate(menuValidator.searchQuery, 'query'), menuItemController.search); // G.4 -- registered before /:itemId so "search" is never mistaken for an id param
router.get('/menu-items/stats', menuItemController.stats); // G.16 -- same ordering reason as /search
router.put('/menu-items/:itemId', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(menuValidator.itemIdParam, 'params'), validate(menuValidator.updateMenuItem), menuItemController.update);
router.post('/menu-items/:itemId/availability', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(menuValidator.itemIdParam, 'params'), validate(menuValidator.setAvailability), menuItemController.setAvailability);
router.delete('/menu-items/:itemId', requireRole(USER_ROLES.OWNER, USER_ROLES.MANAGER), validate(menuValidator.itemIdParam, 'params'), menuItemController.archive);

// H Phase -- Counter & Billing Engine. No role restriction beyond
// "authenticated" here: billing is a cashier's core job, unlike menu
// management which is owner/manager-only.
router.post('/orders', validate(orderValidator.createOrder), orderController.create);
router.get('/orders', validate(orderValidator.listOrdersQuery, 'query'), orderController.list);
router.get('/orders/held', orderController.listHeld); // H.12 -- before /:orderId so "held" is never mistaken for an id param
router.get('/orders/today-stats', orderController.todayStats); // H.13 -- same ordering reason
router.put('/orders/:orderId', validate(orderValidator.orderIdParam, 'params'), validate(orderValidator.updateOrder), orderController.update);
router.post('/orders/:orderId/hold', validate(orderValidator.orderIdParam, 'params'), orderController.hold);
router.post('/orders/:orderId/resume', validate(orderValidator.orderIdParam, 'params'), orderController.resume);
router.post('/orders/:orderId/kot-printed', validate(orderValidator.orderIdParam, 'params'), orderController.markKotPrinted);
router.post('/orders/:orderId/payment', validate(orderValidator.orderIdParam, 'params'), validate(orderValidator.completePayment), orderController.completePayment);
router.post('/orders/:orderId/cancel', validate(orderValidator.orderIdParam, 'params'), orderController.cancel);

module.exports = router;
