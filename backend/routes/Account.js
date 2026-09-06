const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const optionalSession = require('../middleware/OptionalSession');
const optionalAuth = require('../middleware/OptionalAuth');
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
    getProfileReviewsController,
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
router.get('/:accountId/followers', [optionalSession, optionalAuth], getFollowersController);
router.get('/:accountId/following', [optionalSession, optionalAuth], getFollowingController);
router.get('/:accountId/follow-status', [optionalSession, optionalAuth], checkIsFollowingController);
router.get('/profile/:accountId/attachments', [optionalSession, optionalAuth], getProfileAttachmentsController);
router.post('/profile/attachments', [checkSession, requireAuth], createProfileAttachmentController);
router.delete('/profile/attachments/:attachmentId', [checkSession, requireAuth], deleteProfileAttachmentController);
router.get('/:accountId/galleries', [optionalSession, optionalAuth], getUserGalleries);
router.post('/galleries', [checkSession, requireAuth], createGalleryItem);
router.delete('/galleries/:galleryId', [checkSession, requireAuth], deleteGalleryItem);
router.put('/galleries/:galleryId', [checkSession, requireAuth], updateGalleryItem);
router.get('/profile/:accountId', [optionalSession, optionalAuth], getProfileByAccountIdController);
router.get('/profile/:accountId/reviews', [optionalSession, optionalAuth], getProfileReviewsController);
router.get('/links/:accountId', [optionalSession, optionalAuth], getAccountLinkByAccountIdController);
router.get('/profile/avatars/:accountId', [optionalSession, optionalAuth], getProfileAvatarsByAccountIdController);
router.get('/check-user/:accountId', [optionalSession, optionalAuth], checkUserAccountIdController);
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
        const { pool } = require('../lib/Database');
        const accountId = req.user.account_id;
        const { amount } = req.body;
        
        await pool.query(`
            UPDATE wallets 
            SET balance_credits = balance_credits + $1 
            WHERE type = 'account wallets'
            AND wallet_id IN (SELECT wallet_id FROM account_wallets WHERE account_id = $2)
        `, [amount, accountId]);
        
        res.json({ success: true, message: `Successfully added ${amount} credits` });
    } catch (err) {
        console.error("DEV ADD CREDITS ERR:", err);
        res.status(500).json({ error: "Failed to add credits", details: err.message });
    }
});

router.post('/dev/add-rating', [checkSession, requireAuth], async (req, res) => {
    try {
        const { pool } = require('../lib/Database');
        const accountId = req.user.account_id;
        const { ratingType, rating, feedback, title } = req.body;
        
        // Start a transaction to insert dummy tree
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Create a dummy user to be the 'other' party
            const dummyUserRes = await client.query(`
                INSERT INTO accounts (display_name, handle, type, status, tagline)
                VALUES ('Dummy User', 'dummy_user_' || extract(epoch from now()), 'user', 'active', 'Test User')
                RETURNING account_id
            `);
            const dummyId = dummyUserRes.rows[0].account_id;
            
            let contractId;
            
            if (ratingType === 'Uploaded Assets Rating') {
                // Insert into market_assets and asset_reviews
                const assetRes = await client.query(`
                    INSERT INTO market_assets (name, description, price_credits, status)
                    VALUES ($1, 'Dummy Asset', 10, 'Active')
                    RETURNING market_asset_id
                `, [title]);
                
                await client.query(`
                    INSERT INTO market_asset_reviews (market_asset_id, account_id, rating, review)
                    VALUES ($1, $2, $3, $4)
                `, [assetRes.rows[0].market_asset_id, dummyId, rating, feedback]);
                
            } else if (ratingType.includes('Service')) {
                // Gig Contract
                const isFreelancer = ratingType === 'Service Rating';
                const fId = isFreelancer ? accountId : dummyId;
                const cId = isFreelancer ? dummyId : accountId;
                
                const gigRes = await client.query(`
                    INSERT INTO gigs (freelancer_account_id, title, description, payment_type, no_of_concurrent_max, status)
                    VALUES ($1, $2, 'Dummy Gig', 'milestone', 5, 'active')
                    RETURNING gig_id
                `, [fId, title]);
                
                const gigTierRes = await client.query(`
                    INSERT INTO gig_tiers (gig_id, title, description, rate_credits, delivery_days, no_of_revisions_max)
                    VALUES ($1, 'Basic', 'Basic tier', 10, 1, 1)
                    RETURNING gig_tier_id
                `, [gigRes.rows[0].gig_id]);
                
                const reqRes = await client.query(`
                    INSERT INTO gig_requests (client_account_id, gig_tier_id, status)
                    VALUES ($1, $2, 'Accepted')
                    RETURNING gig_request_id
                `, [cId, gigTierRes.rows[0].gig_tier_id]);
                
                const contRes = await client.query(`
                    INSERT INTO contracts (contract_type, payment_type, starts_at, rate_credits, revision_price_credits, status)
                    VALUES ('gig', 'milestone', NOW(), 100, 10, 'Completed')
                    RETURNING contract_id
                `);
                contractId = contRes.rows[0].contract_id;
                
                await client.query(`
                    INSERT INTO gig_contracts (contract_id, gig_request_id)
                    VALUES ($1, $2)
                `, [contractId, reqRes.rows[0].gig_request_id]);
                
                // Rate the accountId
                await client.query(`
                    INSERT INTO ratings (contract_id, account_id, stars_out_of_five, feedback)
                    VALUES ($1, $2, $3, $4)
                `, [contractId, accountId, rating, feedback]);
                
            } else {
                // Job Contract
                const isFreelancer = ratingType === 'Job Execution Rating';
                const fId = isFreelancer ? accountId : dummyId;
                const cId = isFreelancer ? dummyId : accountId;
                
                const jobRes = await client.query(`
                    INSERT INTO jobs (client_account_id, title, description, payment_type, experience_level, no_of_hires, rough_deadline, rate_credits_min, rate_credits_max, status)
                    VALUES ($1, $2, 'Dummy Job', 'fixed', 'Intermediate', 1, NOW() + INTERVAL '7 days', 10, 100, 'active')
                    RETURNING job_id
                `, [cId, title]);
                
                const propRes = await client.query(`
                    INSERT INTO proposals (job_id, freelancer_account_id, rate_credits, letter, status)
                    VALUES ($1, $2, 100, 'Dummy cover', 'Approved')
                    RETURNING proposal_id
                `, [jobRes.rows[0].job_id, fId]);
                
                const contRes = await client.query(`
                    INSERT INTO contracts (contract_type, payment_type, starts_at, rate_credits, revision_price_credits, status)
                    VALUES ('job', 'fixed', NOW(), 100, 10, 'Completed')
                    RETURNING contract_id
                `);
                contractId = contRes.rows[0].contract_id;
                
                await client.query(`
                    INSERT INTO job_contracts (contract_id, proposal_id)
                    VALUES ($1, $2)
                `, [contractId, propRes.rows[0].proposal_id]);
                
                // Rate the accountId
                await client.query(`
                    INSERT INTO ratings (contract_id, account_id, stars_out_of_five, feedback)
                    VALUES ($1, $2, $3, $4)
                `, [contractId, accountId, rating, feedback]);
            }
            
            await client.query('COMMIT');
            res.json({ success: true, message: `Successfully added ${ratingType}` });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Dev add rating error:", err);
        res.status(500).json({ error: err.message || "Failed to add rating." });
    }
});

module.exports = router;
