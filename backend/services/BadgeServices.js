const {
    getBadgeCatalog,
    getBadgeCatalogItem,
    getBadgeCategories,
    createBadgeCategory,
    getCategoryById,
    createBadge,
    updateBadge,
    replaceBadgeRequirements,
    listRequirementDefs,
    getRequirementDef,
    findRequirementDefBySlug,
    findRequirementDefByShape,
    createRequirementDef,
    updateRequirementDef,
    softDeleteRequirementDef,
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
    normalizeOperator,
    compareProgress,
    requirementKind,
} = require('../lib/BadgeRequirements');
const { getIo } = require('../lib/WebSocket');

const MAX_REQUIREMENTS = 8;

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
    let requirements = row.requirements;
    if (typeof requirements === 'string') {
        try { requirements = JSON.parse(requirements); } catch { requirements = []; }
    }
    if (!Array.isArray(requirements)) requirements = [];
    return {
        ...row,
        is_system: SYSTEM_REGISTRY_IDS.has(row.registry_id),
        requirements: requirements.map((item) => ({
            ...item,
            kind: requirementKind(item.metric || item.code),
        })),
    };
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 70);
}

function parseThreshold(value, kind, label) {
    if (kind === 'boolean') return 1;
    const threshold = Number(value ?? 1);
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 10000) {
        throw badgeError(`${label} needs a whole number from 1 to 10,000`);
    }
    return threshold;
}

function parseDefFields(body = {}, { partial = false } = {}) {
    const name = trimText(body.name, { required: !partial, max: 80, field: 'Name' });
    const description = trimText(body.description, { max: 500, field: 'Description' });
    const metricRaw = body.metric ?? body.code;
    const metric = metricRaw == null && partial
        ? undefined
        : normalizeRequirementCode(metricRaw);
    const definition = metric ? getRequirementDefinition(metric) : null;
    if (metric && (!definition || definition.code === 'admin_grant')) {
        throw badgeError(`Unknown requirement metric: ${metric || '(empty)'}`);
    }
    const operator = body.operator == null && partial
        ? undefined
        : normalizeOperator(body.operator || (definition?.kind === 'boolean' ? 'eq' : 'gte'));
    if (body.operator != null && !operator) throw badgeError('Operator must be at least, exactly, or at most');
    const kind = definition?.kind || 'count';
    const threshold = body.threshold == null && partial
        ? undefined
        : parseThreshold(body.threshold ?? body.condition_value, kind, definition?.label || 'Requirement');
    let slug = body.slug == null && partial ? undefined : slugify(body.slug || name || '');
    if (body.slug != null || !partial) {
        if (!slug) throw badgeError('Slug is required');
        if (!REGISTRY_ID_PATTERN.test(slug)) {
            throw badgeError('Slug must be lowercase letters, numbers, and hyphens');
        }
    }
    return { name, description, metric, operator, threshold, slug, kind };
}

async function uniqueRequirementSlug(base) {
    let slug = base || `requirement-${Date.now()}`;
    let attempt = 0;
    while (await findRequirementDefBySlug(slug)) {
        attempt += 1;
        slug = `${base.slice(0, 64)}-${attempt}`;
    }
    return slug;
}

async function resolveRequirementDef(item) {
    const defId = item?.requirementDefId ?? item?.requirement_def_id;
    if (defId) {
        if (!UUID_PATTERN.test(String(defId))) throw badgeError('Invalid requirement');
        const existing = await getRequirementDef(defId);
        if (!existing) throw badgeError('Requirement not found', 404);
        return existing;
    }

    const metric = normalizeRequirementCode(item?.metric ?? item?.code ?? item?.requirementCode);
    const definition = getRequirementDefinition(metric);
    if (!definition || definition.code === 'admin_grant') {
        throw badgeError(`Unknown requirement: ${metric || '(empty)'}`);
    }
    const operator = normalizeOperator(item?.operator) || (definition.kind === 'boolean' ? 'eq' : 'gte');
    const threshold = parseThreshold(item?.threshold ?? item?.condition_value, definition.kind, definition.label);
    const match = await findRequirementDefByShape({ metric: definition.code, operator, threshold });
    if (match) return match;

    const name = trimText(item?.name, { max: 80, field: 'Requirement name' })
        || `${definition.label} ${operator} ${threshold}`;
    const slug = await uniqueRequirementSlug(slugify(item?.slug || name || `${definition.code}-${threshold}`));
    return createRequirementDef({
        slug,
        name,
        description: trimText(item?.description, { max: 500, field: 'Description' }) || definition.description,
        metric: definition.code,
        operator,
        threshold,
        isSystem: false,
    });
}

async function parseRequirements(raw) {
    if (raw == null) return undefined;
    if (!Array.isArray(raw)) throw badgeError('Requirements must be a list');
    if (raw.length > MAX_REQUIREMENTS) throw badgeError(`A badge can have at most ${MAX_REQUIREMENTS} requirements`);

    const seen = new Set();
    const requirements = [];
    for (const item of raw) {
        const def = await resolveRequirementDef(item);
        if (seen.has(def.requirement_def_id)) throw badgeError(`Duplicate requirement: ${def.name}`);
        if (seen.has(def.metric)) throw badgeError(`Duplicate metric on this badge: ${def.metric}`);
        seen.add(def.requirement_def_id);
        seen.add(def.metric);
        requirements.push({
            requirementDefId: def.requirement_def_id,
            code: def.metric,
            operator: def.operator,
            threshold: def.threshold,
            kind: requirementKind(def.metric),
        });
    }
    return requirements;
}

function legacyFieldsFromRequirements(requirements) {
    if (!requirements.length) {
        return { triggerEventCode: 'admin_grant', conditionType: 'boolean', conditionValue: 1 };
    }
    const first = requirements[0];
    return {
        triggerEventCode: first.code,
        conditionType: first.kind,
        conditionValue: first.threshold,
    };
}

function requirementIsMet(requirement, progress, context) {
    const code = requirement.metric || requirement.code;
    if (code === 'admin_grant') return false;
    if (code === 'alpha_access') return context.event === 'signup';
    if (code === 'beta_access') return context.event === 'beta';
    return compareProgress(requirement.operator, progress[code], requirement.threshold);
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

async function getBadgeRequirementTypesService() {
    return listRequirementCatalog();
}

function withDefKind(row) {
    if (!row) return row;
    return { ...row, kind: requirementKind(row.metric) };
}

async function getBadgeRequirementDefsService() {
    const rows = await listRequirementDefs();
    return rows.map(withDefKind);
}

async function createBadgeRequirementDefService(body = {}) {
    const fields = parseDefFields(body);
    const slug = await uniqueRequirementSlug(fields.slug);
    try {
        const created = await createRequirementDef({
            slug,
            name: fields.name,
            description: fields.description || '',
            metric: fields.metric,
            operator: fields.operator,
            threshold: fields.threshold,
            isSystem: false,
        });
        return withDefKind(created);
    } catch (err) {
        if (err.code === '23505') throw badgeError('A requirement with this slug already exists', 409);
        throw err;
    }
}

async function updateBadgeRequirementDefService(defId, body = {}) {
    if (!UUID_PATTERN.test(String(defId || ''))) throw badgeError('Invalid requirement');
    const existing = await getRequirementDef(defId);
    if (!existing) throw badgeError('Requirement not found', 404);
    const parsed = parseDefFields(body, { partial: true });
    const fields = {};
    if (parsed.name != null) fields.name = parsed.name;
    if (parsed.description != null) fields.description = parsed.description;
    if (!existing.is_system) {
        if (parsed.metric) fields.metric = parsed.metric;
        if (parsed.operator) fields.operator = parsed.operator;
        if (parsed.threshold != null) fields.threshold = parsed.threshold;
        if (parsed.slug && parsed.slug !== existing.slug) fields.slug = parsed.slug;
    } else if (parsed.metric || parsed.operator || parsed.threshold != null || parsed.slug) {
        throw badgeError('System requirements can only change name and description');
    }
    if (!Object.keys(fields).length) return withDefKind(existing);
    let updated;
    try {
        updated = await updateRequirementDef(defId, fields);
    } catch (err) {
        if (err.code === '23505') throw badgeError('A requirement with this slug already exists', 409);
        throw err;
    }
    if (!updated) throw badgeError('Requirement not found', 404);
    return withDefKind(updated);
}

async function deleteBadgeRequirementDefService(defId) {
    if (!UUID_PATTERN.test(String(defId || ''))) throw badgeError('Invalid requirement');
    const existing = await getRequirementDef(defId);
    if (!existing) throw badgeError('Requirement not found', 404);
    if (existing.is_system) throw badgeError('System requirements cannot be deleted');
    if (Number(existing.attached_count) > 0) {
        throw badgeError('Detach this requirement from badges before deleting it');
    }
    const deleted = await softDeleteRequirementDef(defId);
    if (!deleted) throw badgeError('Requirement not found', 404);
    return deleted;
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
    const requirements = (await parseRequirements(body.requirements)) ?? [];
    const legacy = requirements.length
        ? legacyFieldsFromRequirements(requirements)
        : {
            triggerEventCode: parseTrigger(body.triggerEventCode ?? body.trigger_event_code) || 'admin_grant',
            conditionType: parseConditionType(body.conditionType ?? body.condition_type) || 'boolean',
            conditionValue: parseConditionValue(
                body.conditionValue ?? body.condition_value,
                parseConditionType(body.conditionType ?? body.condition_type) || 'boolean'
            ) ?? 1,
        };
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
            triggerEventCode: legacy.triggerEventCode,
            conditionType: legacy.conditionType,
            conditionValue: legacy.conditionValue,
            categoryId,
        });
    } catch (err) {
        if (err.code === '23505') throw badgeError('A badge with this registry ID already exists', 409);
        throw err;
    }
    if (!created) throw badgeError('A badge with this registry ID already exists', 409);
    if (body.requirements != null || requirements.length) {
        await replaceBadgeRequirements(created.badge_id, requirements);
    } else if (legacy.triggerEventCode && legacy.triggerEventCode !== 'admin_grant') {
        const fallback = await parseRequirements([{
            code: normalizeRequirementCode(legacy.triggerEventCode),
            threshold: legacy.conditionValue || 1,
        }]);
        await replaceBadgeRequirements(created.badge_id, fallback);
    }
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

    const requirements = await parseRequirements(body.requirements);
    if (requirements) {
        const legacy = legacyFieldsFromRequirements(requirements);
        fields.trigger_event_code = legacy.triggerEventCode;
        fields.condition_type = legacy.conditionType;
        fields.condition_value = legacy.conditionValue;
    }

    let updated;
    try {
        updated = await updateBadge(badgeId, fields);
    } catch (err) {
        if (err.code === '23505') throw badgeError('A badge with this registry ID already exists', 409);
        throw err;
    }
    if (!updated) throw badgeError('Badge not found', 404);
    if (requirements) await replaceBadgeRequirements(badgeId, requirements);
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
        const requirements = Array.isArray(badge.requirements) ? badge.requirements : [];
        if (!requirements.length) continue;
        const allMet = requirements.every((requirement) => requirementIsMet(requirement, progress, context));
        if (!allMet) continue;
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
    evaluateAccountBadges,
    scheduleBadgeEvaluation,
};
