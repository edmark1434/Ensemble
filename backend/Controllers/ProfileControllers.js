const {
    updateProfileAccountServices,
    updateTaglineAndDescriptionServices,
    getPersonalDetailsServices,
    updateProfileUserServices,
    updateProfileOnboarding
} = require('../Services/ProfileServices');

async function updateProfileAccountController(req, res) { 
    try {
        const { accountId } = req.params;
        const payload = req.body;
        
        // Validate accountId
        if (!accountId) {
            return res.status(400).json({
                success: false,
                message: 'Account ID is required'
            });
        }

        // Validate payload
        if (!payload || Object.keys(payload).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No update data provided'
            });
        }

        const result = await updateProfileAccountServices(accountId, payload);
        
        // Check if there were any changes
        if (result.message === 'No changes detected') {
            return res.status(200).json({
                success: true,
                message: 'No changes detected',
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: result.message || 'Profile updated successfully',
            data: result.data
        });
    } catch (err) { 
        console.error('Error in updateProfileAccountController:', err);
        
        // Handle specific error types
        if (err.message.includes('Invalid URL') || err.message.includes('URL is required')) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        if (err.message.includes('Account ID is required') || err.message.includes('Invalid account ID')) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        // Generic server error
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the profile. Please try again.'
        });
    }
}

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

module.exports = {
    updateProfileAccountController,
    updateTaglineAndDescriptionController,
    getPersonalDetailsController,
    updateProfileUserController,
    updateProfileOnboardingController
};