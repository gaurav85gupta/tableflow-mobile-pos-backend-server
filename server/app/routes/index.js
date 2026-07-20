// server/app/routes/index.js
//
// B.12 API Foundation — Versioning strategy: /api/v1/ prefix, applied once
// here in server.js's app.use(), not repeated inside every route file.

const express = require('express');
const healthController = require('../controllers/health.controller');
const authRoutes = require('./auth.routes');
const superAdminAuthRoutes = require('./superAdminAuth.routes');
const restaurantRoutes = require('../restaurant/restaurant.routes');
const superadminRoutes = require('../superadmin/superadmin.routes');
const syncRoutes = require('../sync/sync.routes');

const router = express.Router();

router.get('/health', healthController.check);

router.use('/auth', authRoutes);
router.use('/superadmin-auth', superAdminAuthRoutes); // C.1 Super Admin Authentication
router.use('/restaurant', restaurantRoutes); // "my restaurant" scoped routes (Android POS, Web POS) -- includes G Phase menu/category routes
router.use('/superadmin', superadminRoutes); // Super Admin Website routes (C.2-C.9)
router.use('/sync', syncRoutes); // E.4/E.5 Sync Engine -- upload/download, G Phase's Category/MenuItem are the first real entities

// B.19 Future Hooks — Counter, Dashboard, Intelligence, Inventory,
// Kitchen, QR Ordering, Loyalty each get their own `router.use('/x', ...)`
// line here in a later phase, following the exact same
// controller/service/repository/validator/routes shape used above.

module.exports = router;
