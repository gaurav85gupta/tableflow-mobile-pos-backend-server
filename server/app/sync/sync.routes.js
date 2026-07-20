// server/app/sync/sync.routes.js
//
// G Phase -- Server-side counterpart to the Android app's offline sync
// engine (Phase E's SyncApiService contract:
// POST /api/v1/sync/upload, POST /api/v1/sync/download). Category and
// MenuItem (G Phase) are the first real syncable entities -- see
// sync/syncEntityHandlers.js for the registry future entities extend.

const express = require('express');
const syncController = require('../controllers/sync.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { resolveTenant } = require('../middleware/tenant.middleware');
const syncValidator = require('../validators/sync.validator');

const router = express.Router();

router.use(authenticate, resolveTenant);

router.post('/upload', validate(syncValidator.uploadRequest), syncController.upload);
router.post('/download', validate(syncValidator.downloadRequest), syncController.download);

module.exports = router;
