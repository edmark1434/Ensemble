const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
const {
    getAccountWalletController,
    getProfileController,
    getAccountLinkByAccountIdController,
    checkUserAccountIdController,
    getDisplayNameByAccountIdController,
    updateAndInsertAccountProfileController,
    updateAccountProfileIdController
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
router.post('/update-profile', [checkSession, requireAuth], updateAndInsertAccountProfileController);
router.put('/update-profile-id', [checkSession, requireAuth], updateAccountProfileIdController);
module.exports = router;