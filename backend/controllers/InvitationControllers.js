const {
    shareProjectInvitationService,
    acceptProjectInvitationService,
    InvitationServiceError,
} = require('../services/InvitationServices');

async function shareInvitationController(req, res) {
    try {
        const { projectId, inviterUserId, recipientUserId } = req.body || {};

        const result = await shareProjectInvitationService(
            { projectId, recipientUserId },
            inviterUserId
        );

        return res.status(200).json(result);
    } catch (err) {
        console.error('Error in shareInvitationController:', err);
        if (err instanceof InvitationServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'An error occurred while sharing the project invitation.',
        });
    }
}

async function acceptInvitationController(req, res) {
    try {
        const token = req.query.token;
        if (!token) {
            const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
            return res.redirect(`${frontendUrl}/projects?error=missing_invitation_token`);
        }

        const result = await acceptProjectInvitationService(token);
        return res.redirect(result.redirectUrl);
    } catch (err) {
        console.error('Error in acceptInvitationController:', err);
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const message = encodeURIComponent(err.message || 'Invitation is invalid or has expired');
        return res.redirect(`${frontendUrl}/projects?error=${message}`);
    }
}

module.exports = {
    shareInvitationController,
    acceptInvitationController,
};