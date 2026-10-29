const {
    getBadgeCatalog,
    getBadgeCatalogItem,
    createBadge,
    updateBadge,
    listHeldBadgeIds,
    getAccountBadgeProgress,
    softDeleteBadge,
    getBadgeByRegistryId,
    searchBadgeRecipients,
    getBadgeHolders,
    createPendingBadgeGrants,
    claimAccountBadge,
    revokeAccountBadge,
    getOwnBadgeGrants,
} = require('../repositories/BadgeRepositories');
const {
    listRequirementCatalog,
    getRequirementDefinition,
    normalizeRequirementCode,
    badgeUnlockIsMet,
} = require('../lib/BadgeRequirements');
const { getIo } = require('../lib/WebSocket');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGISTRY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TRIGGER_PATTERN = /^[a-z0-9_]+$/;
const MAX_RECIPIENTS = 200;
const MAX_MESSAGE_LENGTH = 500;
const SYSTEM_REGISTRY_IDS = new Set([
    'acc-alpha',
    'acc-beta',
    'setup-profile',
    'acc-freelance-1',
    'acc-freelance-2',
    'acc-freelance-3',
    'acc-freelance-4',
    'acc-client-1',
    'acc-client-2',
    'acc-client-3',
    'acc-client-4',
    'acc-asset-1',
    'acc-asset-2',
    'acc-asset-3',
    'acc-asset-4',
]);

function badgeError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function withSystemFlag(row) {
    if (!row) return row;
    return {
        ...row,
        is_system: SYSTEM_REGISTRY_IDS.has(row.registry_id),
        trigger_event_code: normalizeRequirementCode(row.trigger_event_code),
    };
}

function trimText(value, { required = false, max, field, min = 1 } = {}) {
    if (value == null) {
        if (required) throw badgeError(`${field} is required`);
        return undefined;
    }
    if (typeof value !== 'string') throw badgeError(`${field} is invalid`);
    const trimmed = value.trim();
    if (!trimmed && required) throw badgeError(`${field} is required`);
    if (trimmed && trimmed.length < min) throw badgeError(`${field} is too short`);
    if (trimmed.length > max) throw badgeError(`${field} must be ${max} characters or fewer`);
    return trimmed;
}

function parseBoolean(value, field, required = false) {
    if (value == null) {
        if (required) throw badgeError(`${field} is required`);
        return undefined;
    }
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    throw badgeError(`${field} is invalid`);
}

function parseRegistryId(value, required = false) {
    const registryId = trimText(value, { required, max: 50, field: 'Registry ID' });
    if (registryId == null) return undefined;
    if (!REGISTRY_ID_PATTERN.test(registryId)) {
        throw badgeError('Registry ID must be lowercase letters, numbers, and hyphens');
    }
    return registryId;
}

function parseTrigger(value, required = false) {
    const trigger = trimText(value, { required, max: 50, field: 'Unlock' });
    if (trigger == null) return undefined;
    if (!TRIGGER_PATTERN.test(trigger)) {
        throw badgeError('Unlock must be lowercase letters, numbers, and underscores');
    }
    return trigger;
}

function parseCount(value, required = false) {
    if (value == null || value === '') {
        if (required) throw badgeError('Count is required');
        return undefined;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10000) {
        throw badgeError('Count must be a whole number from 1 to 10,000');
    }
    return parsed;
}

function parseUnlock(body, existing) {
    const rawTrigger = body.triggerEventCode ?? body.trigger_event_code;
    const parsedTrigger = rawTrigger == null
        ? (existing ? normalizeRequirementCode(existing.trigger_event_code) : 'admin_grant')
        : (parseTrigger(rawTrigger, true) || 'admin_grant');
    const code = normalizeRequirementCode(parsedTrigger);
    const definition = getRequirementDefinition(code);
    if (!definition) throw badgeError(`Unknown unlock: ${code}`);

    const conditionType = definition.kind === 'boolean' ? 'boolean' : 'count';
    const rawCount = body.conditionValue ?? body.condition_value;
    const conditionValue = conditionType === 'boolean'
        ? 1
        : (rawCount == null && existing ? Number(existing.condition_value || 1) : parseCount(rawCount ?? 1, true));

    return { triggerEventCode: code, conditionType, conditionValue };
}

function parseCategory(body, existing, required = false) {
    const category = trimText(body.category ?? body.category_name, {
        required,
        max: 50,
        field: 'Category',
    });
    if (category) return category;
    if (existing?.category) return existing.category;
    if (required) throw badgeError('Category is required');
    return undefined;
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
    const rows = await getBadgeCatalog();
    return rows.map(withSystemFlag);
}

async function getBadgeRequirementTypesService() {
    return listRequirementCatalog();
}

async function createBadgeService(body = {}) {
    const registryId = parseRegistryId(body.registryId ?? body.registry_id, true);
    const name = trimText(body.name, { required: true, max: 50, field: 'Name' });
    const description = trimText(body.description, { required: true, max: 2000, field: 'Description' });
    const isSecret = parseBoolean(body.isSecret ?? body.is_secret, 'Secret flag') ?? false;
    const category = parseCategory(body, null, true);
    const unlock = parseUnlock(body);

    let created;
    try {
        created = await createBadge({
            registryId,
            name,
            description,
            isSecret,
            triggerEventCode: unlock.triggerEventCode,
            conditionType: unlock.conditionType,
            conditionValue: unlock.conditionValue,
            category,
        });
    } catch (err) {
        if (err.code === '23505') throw badgeError('A badge with this registry ID already exists', 409);
        throw err;
    }
    if (!created) throw badgeError('A badge with this registry ID already exists', 409);
    return withSystemFlag(await getBadgeCatalogItem(created.badge_id));
}

async function updateBadgeService(badgeId, body = {}) {
    if (!UUID_PATTERN.test(String(badgeId || ''))) throw badgeError('Invalid badge');
    const existing = await getBadgeCatalogItem(badgeId);
    if (!existing || existing.deleted_at) throw badgeError('Badge not found', 404);

    const isSystem = SYSTEM_REGISTRY_IDS.has(existing.registry_id);
    const fields = {};

    if (body.registryId != null || body.registry_id != null) {
        const registryId = parseRegistryId(body.registryId ?? body.registry_id, true);
        if (isSystem && registryId !== existing.registry_id) {
            throw badgeError('Product badge IDs cannot be changed');
        }
        fields.registry_id = registryId;
    }
    if (body.name != null) fields.name = trimText(body.name, { required: true, max: 50, field: 'Name' });
    if (body.description != null) {
        fields.description = trimText(body.description, { required: true, max: 2000, field: 'Description' });
    }
    if (body.isSecret != null || body.is_secret != null) {
        fields.is_secret = parseBoolean(body.isSecret ?? body.is_secret, 'Secret flag', true);
    }

    const category = parseCategory(body, existing);
    if (category) fields.category = category;

    const unlockTouched = body.triggerEventCode != null || body.trigger_event_code != null
        || body.conditionValue != null || body.condition_value != null;
    if (unlockTouched) {
        const unlock = parseUnlock(body, existing);
        if (isSystem && (
            unlock.triggerEventCode !== normalizeRequirementCode(existing.trigger_event_code)
            || Number(unlock.conditionValue) !== Number(existing.condition_value)
        )) {
            throw badgeError('Product badge unlocks cannot be changed');
        }
        fields.trigger_event_code = unlock.triggerEventCode;
        fields.condition_type = unlock.conditionType;
        fields.condition_value = unlock.conditionValue;
    }

    let updated;
    try {
        updated = await updateBadge(badgeId, fields);
    } catch (err) {
        if (err.code === '23505') throw badgeError('A badge with this registry ID already exists', 409);
        throw err;
    }
    if (!updated) throw badgeError('Badge not found', 404);
    return withSystemFlag(await getBadgeCatalogItem(badgeId));
}

async function evaluateAccountBadges(accountId, context = {}) {
    if (!accountId) return { granted: 0 };
    const [catalog, held, progress] = await Promise.all([
        getBadgeCatalog(),
        listHeldBadgeIds(accountId),
        getAccountBadgeProgress(accountId),
    ]);
    const heldSet = new Set(held.map(String));
    let granted = 0;

    for (const badge of catalog) {
        if (heldSet.has(String(badge.badge_id))) continue;
        if (!badgeUnlockIsMet(badge, progress, context)) continue;
        const result = await createPendingBadgeGrants({
            badge: { badge_id: badge.badge_id, name: badge.name },
            accountIds: [accountId],
        });
        emitNotifications(result.notifications);
        granted += result.grants.length;
    }
    return { granted };
}

function scheduleBadgeEvaluation(accountIds, context = {}) {
    const ids = [...new Set((Array.isArray(accountIds) ? accountIds : [accountIds]).filter(Boolean).map(String))];
    if (!ids.length) return;
    setImmediate(() => {
        Promise.all(ids.map((id) => evaluateAccountBadges(id, context))).catch((err) => {
            console.error('Badge evaluation failed:', err.message);
        });
    });
}

async function deleteBadgeService(badgeId) {
    if (!UUID_PATTERN.test(String(badgeId || ''))) throw badgeError('Invalid badge');
    const existing = await getBadgeCatalogItem(badgeId);
    if (!existing) throw badgeError('Badge not found', 404);
    if (SYSTEM_REGISTRY_IDS.has(existing.registry_id)) {
        throw badgeError('Product badges cannot be deleted. Hide new grants by leaving them ungranted.');
    }
    const deleted = await softDeleteBadge(badgeId);
    if (!deleted) throw badgeError('Badge not found', 404);
    return deleted;
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
    getBadgeRequirementTypesService,
    createBadgeService,
    updateBadgeService,
    deleteBadgeService,
    searchBadgeRecipientsService,
    getBadgeHoldersService,
    revokeBadgeService,
    claimBadgeService,
    getOwnBadgeGrantsService,
    evaluateAccountBadges,
    scheduleBadgeEvaluation,
};
