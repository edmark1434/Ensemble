const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
const {
    getAccountWalletController,
    getProfileController,
    getAccountLinkByAccountIdController,
    checkUserAccountIdController,
    getDisplayNameByAccountIdController
} = require('../Controllers/AccountControllers');
const {
    updateProfileAccountController
} = require('../Controllers/ProfileControllers');

router.put('/profile/:accountId', [checkSession, requireAuth], updateProfileAccountController);
router.get('/wallet', [checkSession, requireAuth], getAccountWalletController);
router.get('/profile/:accountId', [], getProfileController);
router.get('/links/:accountId', [], getAccountLinkByAccountIdController);
router.get('/check-user/:accountId', [], checkUserAccountIdController);
router.post('/display-names', [], getDisplayNameByAccountIdController);
module.exports = router;