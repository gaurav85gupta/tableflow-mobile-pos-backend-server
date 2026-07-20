// server/app/routes/superAdminAuth.routes.js
//
// C.1 Super Admin Authentication. Mounted at /api/v1/superadmin-auth
// (kept separate from /api/v1/auth, which is restaurant-user login) so the
// two flows are never confusable at the URL level either.

const express = require('express');
const superAdminAuthController = require('../controllers/superAdminAuth.controller');
const validate = require('../middleware/validate.middleware');
const superAdminAuthValidator = require('../validators/superAdminAuth.validator');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { loginRateLimiter } = require('../middleware/security.middleware');

const router = express.Router();

router.post('/login', loginRateLimiter, validate(superAdminAuthValidator.login), superAdminAuthController.login);
router.post('/refresh', validate(superAdminAuthValidator.refresh), superAdminAuthController.refresh);
router.post('/logout', validate(superAdminAuthValidator.refresh), superAdminAuthController.logout);

// C.1 Auto Session Restore + Password Change -- require an authenticated super_admin.
router.get('/me', authenticate, requireRole('super_admin'), superAdminAuthController.me);
router.post('/change-password', authenticate, requireRole('super_admin'), validate(superAdminAuthValidator.changePassword), superAdminAuthController.changePassword);

module.exports = router;
