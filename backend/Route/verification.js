const router = require('express').Router();
const { createAccountVerificationController,
    handleVerificationWebhookStatusUpdated,
 } = require('../Controllers/AccountVerificationControllers');
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');

router.post('/create-session', [requireAuth, checkSession], createAccountVerificationController);
router.post('/webhook/status/updated', handleVerificationWebhookStatusUpdated);
module.exports = router;