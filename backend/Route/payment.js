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
} = require('../Services/PaymentServices');
const { getAllPlanControllers,
    getSubcriptionByUserIdControllers
 } = require('../Controllers/SubscriptionControllers');
const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');

router.post('/topup', [checkSession, requireAuth], processTopUpPayment);
router.post('/webhooks/xendit', [], xenditWebhookHandler);
router.post('/subscription', [checkSession, requireAuth], processSubscriptionPayment);
router.get('/plans', [], getAllPlanControllers);

router.get('/payment-methods', [checkSession, requireAuth], getAllPaymentMethodsByUserIdService);
router.post('/topup-by-payment-method', [checkSession, requireAuth], TopUpPaymentByPaymentMethod);
router.post('/webhooks/payment-session-complete', [], paymentSessionCompleteWebhookHandler);
router.post('/webhooks/payment-session-expired', [], paymentSessionExpiredWebhookHandler);
router.post('/create-payment-token', [checkSession, requireAuth], createPaymentToken);
router.post('/webhooks/subscription', [], subscriptionWebhookHandler);
router.post('/cancel-subscription', [checkSession, requireAuth], cancelSubscription);
module.exports = router;