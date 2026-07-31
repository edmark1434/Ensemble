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
    updateAccountProfileIdController,
    settingAccountInfoUpdateController,
    searchUserAccountsByHandleController
} = require('../Controllers/AccountControllers');
const {
    updateTaglineAndDescriptionController,
    getPersonalDetailsController,
    updateProfileUserController,
    updateProfileOnboardingController,
    getProfileByAccountIdController,
    updateProfileSocialMediaController,
    updateProfileDetailsController,
    getProfileAvatarsByAccountIdController,
    getProfileCurrentAvatarByAccountIdController
} = require('../Controllers/ProfileControllers');

router.put('/profile/tagline-description', [checkSession, requireAuth], updateTaglineAndDescriptionController);
router.get('/wallet', [checkSession, requireAuth], getAccountWalletController);
router.get('/search-users', [checkSession, requireAuth], searchUserAccountsByHandleController);
router.get('/personal-details', [checkSession, requireAuth], getPersonalDetailsController);
router.get('/profile/current-avatar', [checkSession, requireAuth], getProfileCurrentAvatarByAccountIdController);
router.get('/profile/:accountId', [checkSession, requireAuth], getProfileByAccountIdController);
router.get('/links/:accountId', [checkSession, requireAuth], getAccountLinkByAccountIdController);
router.get('/profile/avatars/:accountId', [checkSession, requireAuth], getProfileAvatarsByAccountIdController);
router.get('/check-user/:accountId', [checkSession, requireAuth], checkUserAccountIdController);
router.post('/display-names', [checkSession, requireAuth], getDisplayNameByAccountIdController);
router.post('/update-profile', [checkSession, requireAuth], updateAndInsertAccountProfileController);
router.put('/update-profile-id', [checkSession, requireAuth], updateAccountProfileIdController);
router.put('/update-profile-user', [checkSession, requireAuth], updateProfileUserController);
router.put('/update-profile-social-media', [checkSession, requireAuth], updateProfileSocialMediaController);
router.put('/update-profile-onboarding', [checkSession, requireAuth], updateProfileOnboardingController);
router.put('/update-profile-details', [checkSession, requireAuth], updateProfileDetailsController);
router.put('/setting-account-info', [checkSession, requireAuth], settingAccountInfoUpdateController);
module.exports = router;
