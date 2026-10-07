const {
    grantBadgeService,
    getBadgeCatalogService,
    searchBadgeRecipientsService,
    getBadgeHoldersService,
    revokeBadgeService,
    claimBadgeService,
    getOwnBadgeGrantsService,
} = require('../services/BadgeServices');

function sessionAccountId(req) {
    return req.session?.account_id || req.session?.accountId || null;
}

function sendError(res, err, fallback) {
    if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error(fallback, err);
    return res.status(500).json({ success: false, message: fallback });
}

async function getAdminBadgeCatalog(req, res) {
    try {
        return res.status(200).json({ success: true, data: await getBadgeCatalogService() });
    } catch (err) {
        return sendError(res, err, 'Unable to load badges');
    }
}

async function getAdminBadgeRecipients(req, res) {
    try {
        const data = await searchBadgeRecipientsService(req.query.search, req.query.registryId);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return sendError(res, err, 'Unable to search users');
    }
}

async function getAdminBadgeHolders(req, res) {
    try {
        return res.status(200).json({ success: true, data: await getBadgeHoldersService(req.params.registryId) });
    } catch (err) {
        return sendError(res, err, 'Unable to load badge holders');
    }
}

async function postAdminBadgeGrant(req, res) {
    try {
        const result = await grantBadgeService({
            registryId: req.params.registryId,
            accountIds: req.body?.accountIds,
            message: req.body?.message,
            staffId: req.session?.staffId || req.session?.staff_id || null,
        });
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return sendError(res, err, 'Unable to grant badge');
    }
}

async function deleteAdminBadgeGrant(req, res) {
    try {
        return res.status(200).json({ success: true, data: await revokeBadgeService(req.params.accountBadgeId) });
    } catch (err) {
        return sendError(res, err, 'Unable to revoke badge');
    }
}

async function getMyBadgeGrants(req, res) {
    try {
        return res.status(200).json({ success: true, data: await getOwnBadgeGrantsService(sessionAccountId(req)) });
    } catch (err) {
        return sendError(res, err, 'Unable to load badges');
    }
}

async function postClaimBadge(req, res) {
    try {
        const data = await claimBadgeService(sessionAccountId(req), req.params.accountBadgeId);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return sendError(res, err, 'Unable to claim badge');
    }
}

module.exports = {
    getAdminBadgeCatalog,
    getAdminBadgeRecipients,
    getAdminBadgeHolders,
    postAdminBadgeGrant,
    deleteAdminBadgeGrant,
    getMyBadgeGrants,
    postClaimBadge,
};
