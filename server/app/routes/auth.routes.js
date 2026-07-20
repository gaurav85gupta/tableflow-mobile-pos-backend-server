// server/app/routes/auth.routes.js
//
// Public routes (no authenticate middleware — these ARE how you get a
// token). login gets the stricter rate limiter (see security.middleware.js).

const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const authValidator = require('../validators/auth.validator');
const { loginRateLimiter } = require('../middleware/security.middleware');

const router = express.Router();

router.post('/login', loginRateLimiter, validate(authValidator.login), authController.login);
router.post('/refresh', validate(authValidator.refresh), authController.refresh);
router.post('/logout', validate(authValidator.logout), authController.logout);

module.exports = router;
