const {
    getBadgeCatalog,
    getBadgeCatalogItem,
    getBadgeCategories,
    createBadgeCategory,
    getCategoryById,
    createBadge,
    updateBadge,
    softDeleteBadge,
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
const REGISTRY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TRIGGER_PATTERN = /^[a-z0-9_]+$/;
const MAX_RECIPIENTS = 200;
const MAX_MESSAGE_LENGTH = 500;
const CONDITION_TYPES = new Set(['boolean', 'count']);
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
    return { ...row, is_system: SYSTEM_REGISTRY_IDS.has(row.registry_id) };
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

function parseConditionValue(value, conditionType, required = false) {
    if (value == null || value === '') {
        if (required) throw badgeError('Condition value is required');
        return undefined;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) throw badgeError('Condition value must be a whole number of 0 or more');
    if (conditionType === 'boolean' && parsed !== 0 && parsed !== 1) {
        throw badgeError('Boolean conditions must use 0 or 1');
    }
    return parsed;
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
    const trigger = trimText(value, { required, max: 50, field: 'Trigger' });
    if (trigger == null) return undefined;
    if (!TRIGGER_PATTERN.test(trigger)) {
        throw badgeError('Trigger must be lowercase letters, numbers, and underscores');
    }
    return trigger;
}

function parseConditionType(value, required = false) {
    if (value == null || value === '') {
        if (required) throw badgeError('Condition type is required');
        return undefined;
    }
    const type = String(value).trim();
    if (!CONDITION_TYPES.has(type)) throw badgeError('Condition type must be boolean or count');
    return type;
}

async function resolveCategoryId(categoryId, categoryName, categoryDescription, required = false) {
    const trimmedName = trimText(categoryName, { max: 50, field: 'Category name' });
    if (trimmedName) {
        const description = trimText(categoryDescription, { max: 500, field: 'Category description' })
            || 'Custom badge category';
        const category = await createBadgeCategory({ name: trimmedName, description });
        return category.badge_category_id;
    }

    if (categoryId == null || categoryId === '') {
        if (required) throw badgeError('Category is required');
        return undefined;
    }
    if (!UUID_PATTERN.test(String(categoryId))) throw badgeError('Invalid category');
    const category = await getCategoryById(categoryId);
    if (!category) throw badgeError('Category not found', 404);
    return category.badge_category_id;
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

async function getBadgeCategoriesService() {
    return await getBadgeCategories();
}

async function createBadgeCategoryService({ name, description }) {
    const trimmedName = trimText(name, { required: true, max: 50, field: 'Category name' });
    const trimmedDescription = trimText(description, { required: true, max: 500, field: 'Category description' });
    return await createBadgeCategory({ name: trimmedName, description: trimmedDescription });
}

async function createBadgeService(body = {}) {
    const registryId = parseRegistryId(body.registryId ?? body.registry_id, true);
    const name = trimText(body.name, { required: true, max: 50, field: 'Name' });
    const description = trimText(body.description, { required: true, max: 2000, field: 'Description' });
    const isSecret = parseBoolean(body.isSecret ?? body.is_secret, 'Secret flag') ?? false;
    const triggerEventCode = parseTrigger(body.triggerEventCode ?? body.trigger_event_code, true);
    const conditionType = parseConditionType(body.conditionType ?? body.condition_type, true);
    const conditionValue = parseConditionValue(
        body.conditionValue ?? body.condition_value,
        conditionType,
        true
    );
    const categoryId = await resolveCategoryId(
        body.categoryId ?? body.badge_category_id,
        body.categoryName ?? body.category_name,
        body.categoryDescription ?? body.category_description,
        true
    );

    let created;
    try {
        created = await createBadge({
            registryId,
            name,
            description,
            isSecret,
            triggerEventCode,
            conditionType,
            conditionValue,
            categoryId,
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
    if (body.triggerEventCode != null || body.trigger_event_code != null) {
        fields.trigger_event_code = parseTrigger(body.triggerEventCode ?? body.trigger_event_code, true);
    }

    const nextConditionType = parseConditionType(body.conditionType ?? body.condition_type);
    if (nextConditionType) fields.condition_type = nextConditionType;
    const conditionType = fields.condition_type || existing.condition_type;
    if (body.conditionValue != null || body.condition_value != null) {
        fields.condition_value = parseConditionValue(
            body.conditionValue ?? body.condition_value,
            conditionType,
            true
        );
    } else if (nextConditionType === 'boolean' && existing.condition_value !== 0 && existing.condition_value !== 1) {
        fields.condition_value = 1;
    }

    const categoryId = await resolveCategoryId(
        body.categoryId ?? body.badge_category_id,
        body.categoryName ?? body.category_name,
        body.categoryDescription ?? body.category_description
    );
    if (categoryId) fields.badge_category_id = categoryId;

    let updated;
    try {
        updated = await updateBadge(badgeId, fields);
    } catch (err) {
        if (err.code === '23505') throw badgeError('A badge with this registry ID already exists', 409);
        throw err;
    }
    if (!updated) throw badgeError('Badge not found', 404);
    return withSystemFlag(updated);
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
};
