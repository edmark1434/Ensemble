const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const { getWalletOverviewController, searchCashoutAddressesController, createCashoutRecordsController, cashoutWebhookController } = require('../controllers/CashoutControllers');

router.get('/wallets', [checkSession, requireAuth], getWalletOverviewController);
router.get('/address-suggestions', [checkSession, requireAuth], searchCashoutAddressesController);
router.post('/', [checkSession, requireAuth], createCashoutRecordsController);
router.post('/webhooks/xendit', cashoutWebhookController);

module.exports = router;
