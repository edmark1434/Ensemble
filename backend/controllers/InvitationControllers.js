const {
    shareProjectInvitationService,
    acceptProjectInvitationService,
    InvitationServiceError,
} = require('../services/InvitationServices');

async function shareInvitationController(req, res) {
    try {
        const projectId = req.params.id || req.body.projectId || req.body.project_id;
        const recipientAccountId = req.body.recipientAccountId || req.body.accountId || req.body.account_id || req.body.recipientId || req.body.recipient;
        const role = 'Editor';

        const inviterUserId = req.user?.userId || req.user?.user_id;
        const inviterAccountId = req.user?.accountId || req.user?.account_id || req.session?.account_id;

        if (!inviterUserId || !inviterAccountId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: missing active user session',
            });
        }

        const result = await shareProjectInvitationService(
            {
                projectId,
                recipientAccountId,
                role,
            },
            inviterUserId,
            inviterAccountId
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
