const {
    cancelMilestoneService,
    extendMilestoneService,
    approveMilestoneService,
    requestRevisionService,
} = require('../services/MilestoneServices');

const { getAuthorizedActorAccountIds } = require('../services/MarketplaceActorServices');

/**
 * POST /api/contracts/:contractId/milestones/:milestoneId/cancel
 * Client-initiated: cancel an overdue/stalled milestone and get a refund.
 */
async function cancelMilestoneController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const { milestoneId } = req.params;

        if (!milestoneId) {
            return res.status(400).json({ success: false, message: 'Milestone ID is required' });
        }

        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const result = await cancelMilestoneService(milestoneId, actorIds[0]);

        return res.status(200).json({
            success: true,
            message: 'Milestone cancelled and credits refunded to your wallet.',
            data: result,
        });
    } catch (err) {
        console.error('cancelMilestoneController error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
        });
    }
}

/**
 * POST /api/contracts/:contractId/milestones/:milestoneId/extend
 * Client-initiated: extend the deadline by N days.
 * Body: { extensionDays: number }
 */
async function extendMilestoneController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const { milestoneId } = req.params;
        const { extensionDays } = req.body;

        if (!milestoneId) {
            return res.status(400).json({ success: false, message: 'Milestone ID is required' });
        }
        if (!extensionDays || isNaN(Number(extensionDays))) {
            return res.status(400).json({ success: false, message: 'extensionDays must be a number' });
        }

        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const result = await extendMilestoneService(milestoneId, actorIds[0], Number(extensionDays));

        return res.status(200).json({
            success: true,
            message: `Deadline extended by ${extensionDays} day(s).`,
            data: result,
        });
    } catch (err) {
        console.error('extendMilestoneController error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
        });
    }
}

/**
 * POST /api/contracts/:contractId/milestones/:milestoneId/approve
 * Client-initiated: approve the current submission and release credits.
 */
async function approveMilestoneController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const { milestoneId } = req.params;

        if (!milestoneId) {
            return res.status(400).json({ success: false, message: 'Milestone ID is required' });
        }

        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const result = await approveMilestoneService(milestoneId, actorIds[0]);

        return res.status(200).json({
            success: true,
            message: 'Milestone approved. Credits released to the freelancer.',
            data: result,
        });
    } catch (err) {
        console.error('approveMilestoneController error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
        });
    }
}

/**
 * POST /api/contracts/:contractId/milestones/:milestoneId/revision
 * Client-initiated: request a revision on the current submission.
 * Body: { revisionNote?: string }
 */
async function requestRevisionController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const { milestoneId } = req.params;
        const { revisionNote } = req.body;

        if (!milestoneId) {
            return res.status(400).json({ success: false, message: 'Milestone ID is required' });
        }

        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const result = await requestRevisionService(milestoneId, actorIds[0], revisionNote);

        return res.status(200).json({
            success: true,
            message: 'Revision requested. The freelancer has been notified.',
            data: result,
        });
    } catch (err) {
        console.error('requestRevisionController error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
        });
    }
}

module.exports = {
    cancelMilestoneController,
    extendMilestoneController,
    approveMilestoneController,
    requestRevisionController,
};
