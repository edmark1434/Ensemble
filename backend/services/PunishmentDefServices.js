const {
  listPunishmentDefs,
  getPunishmentDefBySlug,
  getPunishmentDefById,
  createPunishmentDef,
  updatePunishmentDef,
  softDeletePunishmentDef,
} = require('../repositories/PunishmentDefRepositories');
const { PUNISHMENT_PRESETS } = require('../lib/PunishmentCatalog');

const ALLOWED_DESKS = ['admin', 'support', 'forum', 'marketplace', 'jobs'];
const ALLOWED_CATEGORIES = [
  'Conduct', 'Forums', 'Inbox', 'Jobs', 'Gigs', 'Marketplace',
  'Teams', 'Identity', 'Money', 'Editor', 'Other',
];
const ALLOWED_KINDS = ['ban', 'suspend', 'timeout'];
const KIND_BY_ACTION = {
  ban: 'ban',
  timeout: 'timeout',
  forum_timeout: 'timeout',
  suspend: 'suspend',
};
const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 365;

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function slugify(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
  return slug || 'punishment';
}

function normalizeKind(kind) {
  const value = String(kind || '').trim().toLowerCase();
  if (!ALLOWED_KINDS.includes(value)) {
    throw serviceError('Kind must be ban, suspend, or timeout.');
  }
  return value;
}

function normalizeDesks(desks, kind) {
  const list = Array.isArray(desks) ? desks : ['admin', 'support'];
  const unique = [...new Set(list.map((desk) => String(desk || '').trim().toLowerCase()).filter((desk) => ALLOWED_DESKS.includes(desk)))];
  if (!unique.includes('admin')) unique.unshift('admin');
  if (kind === 'ban') {
    return unique.filter((desk) => desk === 'admin' || desk === 'support');
  }
  if (kind === 'timeout' && !unique.includes('forum')) unique.push('forum');
  return unique;
}

function normalizeCategory(category) {
  const value = String(category || 'Other').trim() || 'Other';
  const match = ALLOWED_CATEGORIES.find((item) => item.toLowerCase() === value.toLowerCase());
  return match || value.slice(0, 40);
}

function normalizeDurationDays(value, { permanent = false } = {}) {
  if (permanent || value === null || value === '' || String(value).toLowerCase() === 'permanent') {
    return null;
  }
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < MIN_DURATION_DAYS || n > MAX_DURATION_DAYS) {
    throw serviceError('Duration must be 1–365 days, or permanent.');
  }
  return n;
}

function withShape(row) {
  if (!row) return null;
  const durationDays = row.durationDays ?? row.duration_days;
  const permanent = durationDays == null;
  return {
    ...row,
    durationDays: permanent ? null : Number(durationDays),
    duration_days: permanent ? null : Number(durationDays),
    permanent,
  };
}

function fromSeed(row) {
  return withShape({
    ...row,
    slug: row.id,
    punishment_def_id: row.id,
    is_system: true,
  });
}

async function loadLiveOrSeed() {
  try {
    return (await listPunishmentDefs()).map(withShape);
  } catch (err) {
    console.warn('punishment_defs lookup failed, using built-in catalog:', err.message);
    return PUNISHMENT_PRESETS.map(fromSeed);
  }
}

async function listPunishmentCatalog(desk, kind) {
  const rows = await loadLiveOrSeed();
  const key = String(desk || 'admin').trim().toLowerCase();
  const wantedKind = String(kind || '').trim().toLowerCase();
  let filtered = key === 'admin' || key === 'support'
    ? rows
    : rows.filter((row) => Array.isArray(row.desks) && row.desks.includes(key));
  if (ALLOWED_KINDS.includes(wantedKind)) {
    filtered = filtered.filter((row) => row.kind === wantedKind);
  }
  return filtered;
}

async function listPunishmentDefsService() {
  return loadLiveOrSeed();
}

async function resolveIssuedPunishment({ punishmentId, kind } = {}) {
  const slug = String(punishmentId || '').trim();
  const wantedKind = String(kind || '').trim().toLowerCase();
  if (!slug) {
    throw serviceError('Pick a predefined punishment.');
  }
  let preset = null;
  try {
    preset = await getPunishmentDefBySlug(slug);
  } catch (err) {
    console.warn('punishment_defs resolve failed, using built-in catalog:', err.message);
    const builtIn = PUNISHMENT_PRESETS.find((row) => row.id === slug);
    preset = builtIn ? fromSeed(builtIn) : null;
  }
  if (!preset) {
    throw serviceError('Pick a predefined punishment.');
  }
  const shaped = withShape(preset);
  if (wantedKind && shaped.kind !== wantedKind) {
    throw serviceError(`That row is a ${shaped.kind}, not a ${wantedKind}.`);
  }
  return {
    punishmentId: shaped.slug || shaped.id,
    label: shaped.label,
    kind: shaped.kind,
    category: shaped.category,
    durationDays: shaped.durationDays,
    permanent: shaped.permanent,
    note: shaped.note || '',
  };
}

function hasCustomClock(options = {}) {
  if (options.customDuration === true || options.custom_duration === true) return true;
  return false;
}

async function resolveStandingOptions(action, options = {}) {
  const key = String(action || '').trim().toLowerCase();
  const kind = KIND_BY_ACTION[key];
  if (!kind) return options;
  if (options.skipPunishmentCatalog) return options;

  let punishmentId = options.punishmentId || options.punishment_id || '';
  if (!punishmentId && options.disputeId) punishmentId = 'ban_dispute_conviction';

  const resolved = await resolveIssuedPunishment({ punishmentId, kind });
  const custom = hasCustomClock(options);

  if (custom) {
    return {
      ...options,
      punishmentId: resolved.punishmentId,
      punishmentLabel: resolved.label,
      customDuration: true,
    };
  }

  if (resolved.permanent) {
    return {
      ...options,
      duration: 'permanent',
      endsAt: null,
      days: null,
      punishmentId: resolved.punishmentId,
      punishmentLabel: resolved.label,
      customDuration: false,
    };
  }

  return {
    ...options,
    duration: 'temporary',
    days: resolved.durationDays,
    endsAt: undefined,
    punishmentId: resolved.punishmentId,
    punishmentLabel: resolved.label,
    customDuration: false,
  };
}

async function createPunishmentDefService(body) {
  const label = String(body?.label || '').trim();
  if (!label) throw serviceError('A punishment name is required.');
  const kind = normalizeKind(body?.kind);
  const permanent = Boolean(body?.permanent) || body?.durationDays === null;
  const durationDays = normalizeDurationDays(body?.durationDays ?? body?.duration_days, { permanent });
  const category = normalizeCategory(body?.category);
  const desks = normalizeDesks(body?.desks, kind);
  const note = String(body?.note || '').trim().slice(0, 500);
  let slug = slugify(body?.slug || `${kind}_${label}`);
  const existing = await getPunishmentDefBySlug(slug);
  if (existing) slug = `${slug}_${Date.now().toString(36).slice(-4)}`;
  const created = await createPunishmentDef({
    slug,
    kind,
    label: label.slice(0, 120),
    category,
    durationDays,
    desks,
    note,
    isSystem: false,
    sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 1000,
  });
  return withShape(created);
}

async function updatePunishmentDefService(punishmentDefId, body) {
  const current = await getPunishmentDefById(punishmentDefId);
  if (!current) throw serviceError('Punishment not found.', 404);
  const kind = body?.kind != null ? normalizeKind(body.kind) : undefined;
  const nextKind = kind || current.kind;
  const durationTouched = body?.durationDays !== undefined
    || body?.duration_days !== undefined
    || body?.permanent !== undefined;
  const permanent = body?.permanent === true
    || body?.durationDays === null
    || body?.duration_days === null;
  const updated = await updatePunishmentDef(punishmentDefId, {
    kind,
    label: body?.label != null ? String(body.label).trim().slice(0, 120) : undefined,
    category: body?.category != null ? normalizeCategory(body.category) : undefined,
    durationDays: durationTouched
      ? normalizeDurationDays(body?.durationDays ?? body?.duration_days, { permanent })
      : undefined,
    desks: body?.desks != null ? normalizeDesks(body.desks, nextKind) : undefined,
    note: body?.note != null ? String(body.note).trim().slice(0, 500) : undefined,
    sortOrder: body?.sortOrder != null ? Number(body.sortOrder) : undefined,
  });
  if (!updated) throw serviceError('Punishment not found.', 404);
  return withShape(updated);
}

async function deletePunishmentDefService(punishmentDefId) {
  const current = await getPunishmentDefById(punishmentDefId);
  if (!current) throw serviceError('Punishment not found.', 404);
  await softDeletePunishmentDef(punishmentDefId);
  return { punishment_def_id: punishmentDefId, deleted: true };
}

module.exports = {
  ALLOWED_DESKS,
  ALLOWED_CATEGORIES,
  ALLOWED_KINDS,
  listPunishmentCatalog,
  listPunishmentDefsService,
  resolveIssuedPunishment,
  resolveStandingOptions,
  createPunishmentDefService,
  updatePunishmentDefService,
  deletePunishmentDefService,
};
