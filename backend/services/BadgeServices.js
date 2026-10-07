const {
    getBadgeCatalog,
    getBadgeByRegistryId,
    searchBadgeRecipients,
    getBadgeHolders,
    createPendingBadgeGrants,
    claimAccountBadge,
    revokeAccountBadge,
    getOwnBadgeGrants,
} = require('../repositories/BadgeRepositories');
const { getIo } = require('../lib/WebSocket');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RECIPIENTS = 200;
const MAX_MESSAGE_LENGTH = 500;

function badgeError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function emitNotifications(notifications) {
    try {
        const io = getIo();
        for (const notification of notifications) {
            io.to(String(notification.account_id)).emit('notification', notification);
        }
    } catch (err) {
        console.error('Failed to broadcast badge notifications:', err.message);
    }
}

async function grantBadgeService({ registryId, accountIds, staffId = null, message = null }) {
    const ids = [...new Set((Array.isArray(accountIds) ? accountIds : [accountIds]).map(String))];
    if (!registryId) throw badgeError('Badge is required');
    if (!ids.length) throw badgeError('Select at least one recipient');
    if (ids.length > MAX_RECIPIENTS) throw badgeError(`You can grant to at most ${MAX_RECIPIENTS} users at once`);
    if (ids.some((id) => !UUID_PATTERN.test(id))) throw badgeError('Invalid recipient');

    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
        throw badgeError(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
    }

    const badge = await getBadgeByRegistryId(String(registryId));
    if (!badge) throw badgeError('Badge not found', 404);

    const { grants, notifications } = await createPendingBadgeGrants({
        badge,
        accountIds: ids,
        staffId,
        message: trimmedMessage || null,
    });
    emitNotifications(notifications);

    return {
        granted: grants.length,
        skipped: ids.length - grants.length,
    };
}

async function getBadgeCatalogService() {
    return await getBadgeCatalog();
}

async function searchBadgeRecipientsService(search, registryId) {
    return await searchBadgeRecipients(search, registryId);
}

async function getBadgeHoldersService(registryId) {
    if (!registryId) throw badgeError('Badge is required');
    return await getBadgeHolders(String(registryId));
}

async function revokeBadgeService(accountBadgeId) {
    if (!UUID_PATTERN.test(String(accountBadgeId || ''))) throw badgeError('Invalid badge grant');
    const revoked = await revokeAccountBadge(accountBadgeId);
    if (!revoked) throw badgeError('Badge grant not found', 404);
    return revoked;
}

async function claimBadgeService(accountId, accountBadgeId) {
    if (!accountId) throw badgeError('Unauthorized', 401);
    if (!UUID_PATTERN.test(String(accountBadgeId || ''))) throw badgeError('Invalid badge grant');
    const claimed = await claimAccountBadge(accountId, accountBadgeId);
    if (!claimed) throw badgeError('Badge is not available to claim', 404);
    return claimed;
}

async function getOwnBadgeGrantsService(accountId) {
    if (!accountId) throw badgeError('Unauthorized', 401);
    return await getOwnBadgeGrants(accountId);
}

module.exports = {
    grantBadgeService,
    getBadgeCatalogService,
    searchBadgeRecipientsService,
    getBadgeHoldersService,
    revokeBadgeService,
    claimBadgeService,
    getOwnBadgeGrantsService,
};
