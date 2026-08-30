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
    getProfileReviewsByAccountIdService
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

async function getProfileByAccountIdController(req, res) {
    try {
        const { accountId } = req.params;
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
        const { account_id } = req.session;
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

module.exports = {
    getProfileReviewsController,
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
};
