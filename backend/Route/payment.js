const {
    processTopUpPayment,
    xenditWebhookHandler,
    processTopUpPaymentByCards
} = require('../Services/TopUpServices');
const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');

router.post('/topup', [checkSession, requireAuth], processTopUpPaymentByCards);
router.post('/webhooks/xendit', [], xenditWebhookHandler);
router.post('/topup/cards', [checkSession, requireAuth], processTopUpPaymentByCards);
module.exports = router;