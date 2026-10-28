const {
    updateTaglineAndDescriptionServices,
    getPersonalDetailsServices,
    updateProfileUserServices,
    updateProfileOnboarding,
    getProfileByAccountIdService,
    profileSocialMediaUpdateService,
    updateProfileDetailsServices,
    getProfileAvatarsByAccountIdService,
    getProfileCurrentAvatarByAccountIdService,
    getProfileReviewsByAccountIdService,
    getProfileHistoryByAccountIdService,
    updateBudgetCreditsServices,
    updateBannerPresetServices,
    ProfileBudgetError
} = require('../services/ProfileServices');
const {
    getProfileAttachmentsService,
    createProfileAttachmentService,
    deleteProfileAttachmentService,
} = require('../services/ProfileAttachmentServices');



async function updateTaglineAndDescriptionController(req, res) {
    try {
        const { accountId } = req.session;
        const { tagline, description } = req.body;
        await updateTaglineAndDescriptionServices(accountId, tagline, description);
        return res.status(200).json({
            success: true,
            message: 'Tagline and description updated successfully'
        });
    } catch (err) {
        console.error('Error in updateTaglineAndDescriptionController:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the tagline and description. Please try again.'
        });
    }
}

async function updateBudgetCreditsController(req, res) {
    try {
        const budgetCredits = await updateBudgetCreditsServices(req.session.accountId, req.body?.budget_credits);
        return res.status(200).json({ success: true, data: { budget_credits: budgetCredits } });
    } catch (err) {
        if (err instanceof ProfileBudgetError) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        console.error('Error in updateBudgetCreditsController:', err);
        return res.status(500).json({ success: false, message: 'Unable to update budget. Please try again.' });
    }
}

async function updateBannerPresetController(req, res) {
    try {
        const bannerPreset = await updateBannerPresetServices(req.session.account_id, req.body?.banner_preset);
        return res.status(200).json({ success: true, data: { banner_preset: bannerPreset } });
    } catch (err) {
        if (err instanceof ProfileBudgetError) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        console.error('Error in updateBannerPresetController:', err);
        return res.status(500).json({ success: false, message: 'Unable to update banner. Please try again.' });
    }
}

async function getPersonalDetailsController(req, res) { 
    try {
        const { userId } = req.session;
        const personalDetails = await getPersonalDetailsServices(userId);
        return res.status(200).json({
            success: true,
            data: personalDetails
        });
    }catch (err) {
        console.error('Error in getPersonalDetailsController:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching personal details. Please try again.'
        });
    }
}

async function updateProfileUserController(req, res) {
    try {
        const { userId } = req.session;
        const {originalForm, updates} = req.body;
        const result = await updateProfileUserServices(userId, originalForm, updates);
        if (!result) {
            return res.status(200).json({
                success: true,
                message: 'No changes to apply'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (err) {
        console.error('Error in updateProfileUserController:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the profile. Please try again.'
        });
    }
}

async function updateProfileOnboardingController(req, res) {
    try {
        const { userId } = req.session;
        const  completed_onboarding = req.body;
        await updateProfileOnboarding(userId, completed_onboarding);
        return res.status(200).json({
            success: true,
            message: 'Onboarding step updated successfully'
        });
    } catch (err) {
        console.error('Error in updateProfileOnboardingController:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the onboarding step. Please try again.'
        });
    }
}

async function hiddenProfileResponse(req, res, accountId) {
    const { profileHiddenFromViewer } = require('../services/AccountDeactivationServices');
    if (!(await profileHiddenFromViewer(accountId, req.session))) return false;
    res.status(404).json({ success: false, code: 'ACCOUNT_DEACTIVATED', message: 'Profile not found.' });
    return true;
}

async function getPublicDisputeDiscussionController(req, res) {
    try {
        const viewerId = req.session?.account_id || req.session?.accountId || null;
        const { getPublicDisputeDiscussion } = require('../repositories/DisputeChatRepositories');
        const data = await getPublicDisputeDiscussion(req.params.disputeId, viewerId);
        if (!data) {
            return res.status(404).json({ success: false, message: 'This dispute is not public.' });
        }
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Error loading public dispute discussion:', err);
        return res.status(500).json({ success: false, message: 'Could not load this dispute.' });
    }
}

async function postPublicDisputeCommentController(req, res) {
    try {
        const accountId = req.session?.account_id || req.session?.accountId || req.user?.account_id;
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Sign in to comment.' });
        }
        const { postPublicDisputeComment } = require('../repositories/DisputeChatRepositories');
        await postPublicDisputeComment(req.params.disputeId, accountId, req.body?.body);
        return res.status(201).json({
            success: true,
            message: 'Comment sent to staff. It stays private until a moderator publishes it.',
        });
    } catch (err) {
        console.error('Error posting public dispute comment:', err);
        const status = Number(err.statusCode) || (/MongoDB/i.test(err.message || '') ? 503 : 500);
        return res.status(status).json({
            success: false,
            message: status >= 500 ? 'Could not send that comment.' : err.message,
        });
    }
}

async function getProfileByAccountIdController(req, res) {
    try {
        const { accountId } = req.params;
        if (await hiddenProfileResponse(req, res, accountId)) return;
        const profile = await getProfileByAccountIdService(accountId);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }
        return res.status(200).json({
            success: true,
            data: profile
        });
    } catch (err) {
        console.error('Error in getProfileByAccountIdController:', err);
        return res.status(err.message === 'Invalid account ID' ? 400 : 500).json({
            success: false,
            message: err.message === 'Invalid account ID' ? 'Invalid account ID.' : 'An error occurred while fetching the profile. Please try again.'
        });
    }
}

async function updateProfileSocialMediaController(req, res) {
    try{
        const {account_id} = req.session;
        const {updatedLinks, originalLinks} = req.body;
        const result = await profileSocialMediaUpdateService(account_id, originalLinks, updatedLinks);
        return res.status(200).json({
            success: true,
            message: 'Social media links updated successfully',
            result: result
        });
    }catch (err) {
        console.error('Error in updateProfileSocialMediaController:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the social media links. Please try again.'
        });
    }
}
async function updateProfileDetailsController(req, res) {
    try {
        const { account_id } = req.session;
        const { original, updates } = req.body;
        const result = await updateProfileDetailsServices(account_id, original, updates);
        return res.status(200).json({
            success: true,
            message: 'Profile details updated successfully',
            result: result
        });
    } catch (err) {
        console.error('Error in updateProfileDetailsController:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the profile details. Please try again.'
        });
    }
}

async function getProfileAvatarsByAccountIdController(req, res) {
    if (await hiddenProfileResponse(req, res, req.params.accountId)) return;
    try {
        const { accountId } = req.params;
        const avatars = await getProfileAvatarsByAccountIdService(accountId);
        return res.status(200).json({
            success: true,
            data: avatars
        });
    } catch (err) {
        console.error('Error in getProfileAvatarsByAccountIdController:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the profile avatars. Please try again.'
        });
    }
}

async function getProfileCurrentAvatarByAccountIdController(req, res) {
    try {
        const account_id = req.session?.account_id || req.session?.accountId;
        if (!account_id) {
            return res.status(401).json({
                success: false,
                message: 'No active session or account ID found'
            });
        }
        const currentAvatar = await getProfileCurrentAvatarByAccountIdService(account_id);
        return res.status(200).json({
            success: true,
            data: currentAvatar
        });
    } catch (err) {
        console.error('Error in getProfileCurrentAvatarByAccountIdController:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the current profile avatar. Please try again.'
        });
    }
}

async function getProfileAttachmentsController(req, res) {
    try {
        if (await hiddenProfileResponse(req, res, req.params.accountId)) return;
        const attachments = await getProfileAttachmentsService(
            req.params.accountId,
            req.session?.account_id
        );
        return res.status(200).json({ success: true, attachments });
    } catch (err) {
        console.error('Error fetching profile attachments:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Unable to fetch profile attachments',
        });
    }
}

async function createProfileAttachmentController(req, res) {
    try {
        const attachment = await createProfileAttachmentService(
            req.session.account_id,
            req.body
        );
        return res.status(201).json({
            success: true,
            message: 'Profile attachment created successfully',
            attachment,
        });
    } catch (err) {
        console.error('Error creating profile attachment:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Unable to create profile attachment',
        });
    }
}

async function deleteProfileAttachmentController(req, res) {
    try {
        await deleteProfileAttachmentService(
            req.params.attachmentId,
            req.session.account_id
        );
        return res.status(200).json({
            success: true,
            message: 'Profile attachment removed successfully',
        });
    } catch (err) {
        console.error('Error deleting profile attachment:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Unable to remove profile attachment',
        });
    }
}

async function getProfileReviewsController(req, res) {
    try {
        const { accountId } = req.params;
        if (await hiddenProfileResponse(req, res, accountId)) return;
        const reviews = await getProfileReviewsByAccountIdService(accountId);
        return res.status(200).json({
            success: true,
            data: reviews
        });
    } catch (err) {
        console.error('Error fetching reviews:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching reviews.'
        });
    }
}

async function getProfileHistoryController(req, res) {
    try {
        const { accountId } = req.params;
        if (await hiddenProfileResponse(req, res, accountId)) return;
        const viewerAccountId = req.session?.accountId || req.user?.accountId || req.user?.account_id || null;
        const history = await getProfileHistoryByAccountIdService(accountId, viewerAccountId);
        return res.status(200).json({
            success: true,
            data: history
        });
    } catch (err) {
        console.error('Error fetching profile history:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching contract history.'
        });
    }
}

module.exports = {
    updateBudgetCreditsController,
    updateBannerPresetController,
    getProfileReviewsController,
    getProfileHistoryController,
    updateTaglineAndDescriptionController,
    getPersonalDetailsController,
    updateProfileUserController,
    updateProfileOnboardingController,
    getProfileByAccountIdController,
    getPublicDisputeDiscussionController,
    postPublicDisputeCommentController,
    updateProfileSocialMediaController,
    updateProfileDetailsController,
    getProfileAvatarsByAccountIdController,
    getProfileCurrentAvatarByAccountIdController,
    getProfileAttachmentsController,
    createProfileAttachmentController,
    deleteProfileAttachmentController
};
