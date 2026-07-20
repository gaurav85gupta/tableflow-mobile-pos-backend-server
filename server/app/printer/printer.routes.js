// server/app/printer/printer.routes.js
//
// Printing in this system happens on-device (Android app talks to a
// Bluetooth thermal printer directly — see the Android project's
// `printer/PrinterService.kt`). The server's role, when built, will be
// limited to things that need central coordination: e.g. a KOT template
// definition per restaurant, or a print-job audit log for support/debugging.
// No such endpoints exist yet — placeholder only, per B.19.

const express = require('express');

const router = express.Router();

// Future: router.get('/templates', authenticate, resolveTenant, printerController.getTemplates);

module.exports = router;
