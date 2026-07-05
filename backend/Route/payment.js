const {
    xenditWebhookHandler,
    processTopUpPayment,
    processSubscriptionPayment
} = require('../Services/TopUpServices');
const { getAllPlanControllers } = require('../Controllers/SubscriptionControllers');
const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');

router.post('/topup', [checkSession, requireAuth], processTopUpPayment);
router.post('/webhooks/xendit', [], xenditWebhookHandler);
router.post('/subscription', [checkSession, requireAuth], processSubscriptionPayment);
router.get('/plans', [], getAllPlanControllers);
module.exports = router;