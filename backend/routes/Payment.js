const {
    xenditWebhookHandler,
    processTopUpPayment,
    processSubscriptionPayment,
    getAllPaymentMethodsByUserIdService,
    paymentSessionCompleteWebhookHandler,
    paymentSessionExpiredWebhookHandler,
    TopUpPaymentByPaymentMethod,
    createPaymentToken,
    subscriptionWebhookHandler,
    cancelSubscription
} = require('../services/PaymentServices');
const { getAllPlanControllers,
    getSubcriptionByUserIdControllers
 } = require('../controllers/SubscriptionControllers');
const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const verifyXenditWebhook = require('../middleware/VerifyXenditWebhook');

router.post('/topup', [checkSession, requireAuth], processTopUpPayment);
router.post('/webhooks/xendit', verifyXenditWebhook, xenditWebhookHandler);
router.post('/subscription', [checkSession, requireAuth], processSubscriptionPayment);
router.get('/plans', [], getAllPlanControllers);

router.get('/payment-methods', [checkSession, requireAuth], getAllPaymentMethodsByUserIdService);
router.post('/topup-by-payment-method', [checkSession, requireAuth], TopUpPaymentByPaymentMethod);
router.post('/webhooks/payment-session-complete', verifyXenditWebhook, paymentSessionCompleteWebhookHandler);
router.post('/webhooks/payment-session-expired', verifyXenditWebhook, paymentSessionExpiredWebhookHandler);
router.post('/create-payment-token', [checkSession, requireAuth], createPaymentToken);
router.post('/webhooks/subscription', verifyXenditWebhook, subscriptionWebhookHandler);
router.post('/cancel-subscription', [checkSession, requireAuth], cancelSubscription);
module.exports = router;
