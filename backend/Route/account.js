const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
const {
    getAccountWalletController,
} = require('../Controllers/AccountControllers');

router.get('/wallet', [checkSession, requireAuth], getAccountWalletController);


module.exports = router;