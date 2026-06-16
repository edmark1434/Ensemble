const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
const {
    getAccountWalletController,
    getProfileController
} = require('../Controllers/AccountControllers');

router.get('/wallet', [checkSession, requireAuth], getAccountWalletController);
router.get('/profile/:accountId', [], getProfileController);

module.exports = router;