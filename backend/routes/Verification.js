const router = require('express').Router();
const { createAccountVerificationController,
    handleVerificationWebhookStatusUpdated,
    getAccountVerificationStatusController,
    sendVerificationController,
    verifyCode,
    createBusinessVerificationController
 } = require('../controllers/AccountVerificationControllers');
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');

router.get('/status', [checkSession, requireAuth], getAccountVerificationStatusController);
router.post('/create-session', [requireAuth, checkSession], createAccountVerificationController);
router.post('/create-business-verification', [requireAuth, checkSession], createBusinessVerificationController);
router.post('/webhook/status/updated', handleVerificationWebhookStatusUpdated);
router.post('/email', [checkSession, requireAuth], sendVerificationController);
router.post('/verify-code', [checkSession, requireAuth], verifyCode);
module.exports = router;