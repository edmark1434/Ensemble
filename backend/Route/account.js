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
    updateProfileAccountController,
    updateTaglineAndDescriptionController,
    getPersonalDetailsController,
    updateProfileUserController,
    updateProfileOnboardingController
} = require('../Controllers/ProfileControllers');

router.put('/profile/:accountId', [checkSession, requireAuth], updateProfileAccountController);
router.put('/profile/tagline-description', [checkSession, requireAuth], updateTaglineAndDescriptionController);
router.get('/wallet', [checkSession, requireAuth], getAccountWalletController);
router.get('/personal-details', [checkSession, requireAuth], getPersonalDetailsController);
router.get('/profile/:accountId', [], getProfileController);
router.get('/links/:accountId', [], getAccountLinkByAccountIdController);
router.get('/check-user/:accountId', [], checkUserAccountIdController);
router.post('/display-names', [], getDisplayNameByAccountIdController);
router.post('/update-profile', [checkSession, requireAuth], updateAndInsertAccountProfileController);
router.put('/update-profile-id', [checkSession, requireAuth], updateAccountProfileIdController);
router.put('/update-profile-user', [checkSession, requireAuth], updateProfileUserController);
router.put('/update-profile-onboarding', [checkSession, requireAuth], updateProfileOnboardingController);
module.exports = router;