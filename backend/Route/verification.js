const router = require('express').Router();
const { createAccountVerificationController,
    handleVerificationWebhookStatusUpdated,
    getAccountVerificationStatusController,
    sendVerificationController,
    verifyCode
 } = require('../Controllers/AccountVerificationControllers');
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');

router.get('/status', [checkSession, requireAuth], getAccountVerificationStatusController);
router.post('/create-session', [requireAuth, checkSession], createAccountVerificationController);
router.post('/webhook/status/updated', handleVerificationWebhookStatusUpdated);
router.post('/email', [checkSession, requireAuth], sendVerificationController);
router.post('/verify-code', [checkSession, requireAuth], verifyCode);
module.exports = router;