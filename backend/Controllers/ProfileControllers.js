const {
    updateProfileAccountServices
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
module.exports = {
    updateProfileAccountController
};