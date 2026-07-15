const {
    updateTaglineAndDescriptionServices,
    getPersonalDetailsServices,
    updateProfileUserServices,
    updateProfileOnboarding,
    getProfileByAccountIdService,
    profileSocialMediaUpdateService,
    updateProfileDetailsServices,
    getProfileAvatarsByAccountIdService,
    getProfileCurrentAvatarByAccountIdService
} = require('../Services/ProfileServices');



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
        return res.status(200).json({
            success: true,
            data: profile
        });
    } catch (err) {
        console.error('Error in getProfileByAccountIdController:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the profile. Please try again.'
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

module.exports = {
    updateTaglineAndDescriptionController,
    getPersonalDetailsController,
    updateProfileUserController,
    updateProfileOnboardingController,
    getProfileByAccountIdController,
    updateProfileSocialMediaController,
    updateProfileDetailsController,
    getProfileAvatarsByAccountIdController,
    getProfileCurrentAvatarByAccountIdController
};