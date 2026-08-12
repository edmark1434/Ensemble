const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const {
    getAccountWalletController,
    getProfileController,
    getAccountLinkByAccountIdController,
    checkUserAccountIdController,
    getDisplayNameByAccountIdController,
    updateAndInsertAccountProfileController,
    updateAccountProfileIdController,
    settingAccountInfoUpdateController,
    searchUserAccountsByHandleController,
    getRecentUserAvatarsController,
    followUserController,
    unfollowUserController,
    getFollowersController,
    getFollowingController,
    checkIsFollowingController,
    curateBadgesController
} = require('../controllers/AccountControllers');
const {
    updateTaglineAndDescriptionController,
    getPersonalDetailsController,
    updateProfileUserController,
    updateProfileOnboardingController,
    getProfileByAccountIdController,
    updateProfileSocialMediaController,
    updateProfileDetailsController,
    getProfileAvatarsByAccountIdController,
    getProfileCurrentAvatarByAccountIdController,
    getProfileAttachmentsController,
    createProfileAttachmentController,
    deleteProfileAttachmentController
} = require('../controllers/ProfileControllers');
const {
    getUserGalleries,
    createGalleryItem,
    deleteGalleryItem,
    updateGalleryItem
} = require('../controllers/GalleryControllers');
const { adjustAccountCredits } = require('../repositories/AdminUserTeamRepositories');

router.get('/recent-avatars', getRecentUserAvatarsController);
router.put('/profile/tagline-description', [checkSession, requireAuth], updateTaglineAndDescriptionController);
router.get('/wallet', [checkSession, requireAuth], getAccountWalletController);
router.get('/search-users', [checkSession, requireAuth], searchUserAccountsByHandleController);
router.get('/personal-details', [checkSession, requireAuth], getPersonalDetailsController);
router.get('/profile/current-avatar', [checkSession, requireAuth], getProfileCurrentAvatarByAccountIdController);
router.post('/:accountId/follow', [checkSession, requireAuth], followUserController);
router.delete('/:accountId/follow', [checkSession, requireAuth], unfollowUserController);
router.get('/:accountId/followers', [checkSession], getFollowersController);
router.get('/:accountId/following', [checkSession], getFollowingController);
router.get('/:accountId/follow-status', [checkSession], checkIsFollowingController);
router.get('/profile/:accountId/attachments', [checkSession, requireAuth], getProfileAttachmentsController);
router.post('/profile/attachments', [checkSession, requireAuth], createProfileAttachmentController);
router.delete('/profile/attachments/:attachmentId', [checkSession, requireAuth], deleteProfileAttachmentController);
router.get('/:accountId/galleries', [checkSession, requireAuth], getUserGalleries);
router.post('/galleries', [checkSession, requireAuth], createGalleryItem);
router.delete('/galleries/:galleryId', [checkSession, requireAuth], deleteGalleryItem);
router.put('/galleries/:galleryId', [checkSession, requireAuth], updateGalleryItem);
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
router.put('/profile/badges/curate', [checkSession, requireAuth], curateBadgesController);

router.post('/dev/add-credits', [checkSession, requireAuth], async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
        
        await adjustAccountCredits(accountId, amount, "Dev Mode Injection", "00000000-0000-0000-0000-000000000000");
        res.json({ success: true, message: `Successfully added ${amount} credits to your account.` });
    } catch (err) {
        console.error("Dev add credits error:", err);
        res.status(500).json({ error: err.message || "Failed to add credits." });
    }
});

module.exports = router;
