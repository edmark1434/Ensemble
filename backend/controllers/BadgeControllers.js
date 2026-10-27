const {
    grantBadgeService,
    getBadgeCatalogService,
    getBadgeRequirementTypesService,
    getBadgeRequirementDefsService,
    createBadgeRequirementDefService,
    updateBadgeRequirementDefService,
    deleteBadgeRequirementDefService,
    getBadgeCategoriesService,
    createBadgeCategoryService,
    createBadgeService,
    updateBadgeService,
    deleteBadgeService,
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

async function getAdminBadgeRequirementTypes(req, res) {
    try {
        return res.status(200).json({ success: true, data: await getBadgeRequirementTypesService() });
    } catch (err) {
        return sendError(res, err, 'Unable to load badge requirements');
    }
}

async function getAdminBadgeRequirementDefs(req, res) {
    try {
        return res.status(200).json({ success: true, data: await getBadgeRequirementDefsService() });
    } catch (err) {
        return sendError(res, err, 'Unable to load badge requirements');
    }
}

async function postAdminBadgeRequirementDef(req, res) {
    try {
        const data = await createBadgeRequirementDefService(req.body || {});
        return res.status(201).json({ success: true, data });
    } catch (err) {
        return sendError(res, err, 'Unable to create requirement');
    }
}

async function patchAdminBadgeRequirementDef(req, res) {
    try {
        const data = await updateBadgeRequirementDefService(req.params.defId, req.body || {});
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return sendError(res, err, 'Unable to update requirement');
    }
}

async function deleteAdminBadgeRequirementDef(req, res) {
    try {
        const data = await deleteBadgeRequirementDefService(req.params.defId);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return sendError(res, err, 'Unable to delete requirement');
    }
}

async function getAdminBadgeCategories(req, res) {
    try {
        return res.status(200).json({ success: true, data: await getBadgeCategoriesService() });
    } catch (err) {
        return sendError(res, err, 'Unable to load badge categories');
    }
}

async function postAdminBadgeCategory(req, res) {
    try {
        const data = await createBadgeCategoryService(req.body || {});
        return res.status(201).json({ success: true, data });
    } catch (err) {
        return sendError(res, err, 'Unable to create badge category');
    }
}

async function postAdminBadge(req, res) {
    try {
        const data = await createBadgeService(req.body || {});
        return res.status(201).json({ success: true, data });
    } catch (err) {
        return sendError(res, err, 'Unable to create badge');
    }
}

async function patchAdminBadge(req, res) {
    try {
        const data = await updateBadgeService(req.params.badgeId, req.body || {});
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return sendError(res, err, 'Unable to update badge');
    }
}

async function deleteAdminBadge(req, res) {
    try {
        const data = await deleteBadgeService(req.params.badgeId);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return sendError(res, err, 'Unable to delete badge');
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
    getAdminBadgeRequirementTypes,
    getAdminBadgeRequirementDefs,
    postAdminBadgeRequirementDef,
    patchAdminBadgeRequirementDef,
    deleteAdminBadgeRequirementDef,
    getAdminBadgeCategories,
    postAdminBadgeCategory,
    postAdminBadge,
    patchAdminBadge,
    deleteAdminBadge,
    getAdminBadgeRecipients,
    getAdminBadgeHolders,
    postAdminBadgeGrant,
    deleteAdminBadgeGrant,
    getMyBadgeGrants,
    postClaimBadge,
};
