const {
  listWarningDefs,
  getWarningDefBySlug,
  getWarningDefByLabel,
  getWarningDefById,
  createWarningDef,
  updateWarningDef,
  softDeleteWarningDef,
} = require('../repositories/WarningDefRepositories');
const { clampWarningPoints, warningDurationDays, warningHit } = require('../lib/Merit');
const { WARNING_PRESETS } = require('../lib/WarningCatalog');

const ALLOWED_DESKS = ['admin', 'support', 'forum', 'marketplace', 'jobs'];
const ALLOWED_CATEGORIES = [
  'Conduct', 'Forums', 'Inbox', 'Jobs', 'Gigs', 'Marketplace',
  'Teams', 'Identity', 'Money', 'Editor', 'Other',
];

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
  return slug || 'warning';
}

function normalizeDesks(desks) {
  const list = Array.isArray(desks) ? desks : ['admin', 'support'];
  const unique = [...new Set(list.map((desk) => String(desk || '').trim().toLowerCase()).filter((desk) => ALLOWED_DESKS.includes(desk)))];
  if (!unique.includes('admin')) unique.unshift('admin');
  return unique;
}

function normalizeCategory(category) {
  const value = String(category || 'Other').trim() || 'Other';
  const match = ALLOWED_CATEGORIES.find((item) => item.toLowerCase() === value.toLowerCase());
  return match || value.slice(0, 40);
}

function withMerit(row) {
  if (!row) return null;
  const points = clampWarningPoints(row.points);
  return {
    ...row,
    points,
    meritHit: warningHit(points),
    durationDays: warningDurationDays(points),
  };
}

async function listWarningCatalog(desk) {
  let rows = [];
  try {
    rows = await listWarningDefs();
  } catch (err) {
    console.warn('warning_defs lookup failed, using built-in catalog:', err.message);
    rows = WARNING_PRESETS.map((row) => ({ ...row, slug: row.id }));
  }
  const key = String(desk || 'admin').trim().toLowerCase();
  const filtered = key === 'admin' || key === 'support'
    ? rows
    : rows.filter((row) => Array.isArray(row.desks) && row.desks.includes(key));
  return filtered.map(withMerit);
}

async function listWarningDefsService() {
  return (await listWarningDefs()).map(withMerit);
}

async function resolveIssuedWarning({ warningId, type } = {}) {
  const slug = String(warningId || '').trim();
  const label = String(type || '').trim();
  let preset = null;
  try {
    if (slug) preset = await getWarningDefBySlug(slug);
    if (!preset && label) preset = await getWarningDefByLabel(label);
    if (!preset && /report sanction/i.test(label)) preset = await getWarningDefBySlug('staff_follow_up');
  } catch (err) {
    console.warn('warning_defs resolve failed, using built-in catalog:', err.message);
    const builtIn = WARNING_PRESETS.find((row) => row.id === slug)
      || WARNING_PRESETS.find((row) => row.label.toLowerCase() === label.toLowerCase())
      || (/report sanction/i.test(label) ? WARNING_PRESETS.find((row) => row.id === 'staff_follow_up') : null);
    preset = builtIn ? { ...builtIn, slug: builtIn.id } : null;
  }
  if (!preset) {
    throw serviceError('Pick a predefined warning. Points are locked to that warning.');
  }
  const points = clampWarningPoints(preset.points);
  return {
    warningId: preset.slug || preset.id,
    type: preset.label,
    points,
    category: preset.category,
    meritHit: warningHit(points),
    durationDays: warningDurationDays(points),
  };
}

async function createWarningDefService(body) {
  const label = String(body?.label || '').trim();
  if (!label) throw serviceError('A warning name is required.');
  const points = clampWarningPoints(body?.points);
  const category = normalizeCategory(body?.category);
  const desks = normalizeDesks(body?.desks);
  const note = String(body?.note || '').trim().slice(0, 500);
  let slug = slugify(body?.slug || label);
  const existing = await getWarningDefBySlug(slug);
  if (existing) slug = `${slug}_${Date.now().toString(36).slice(-4)}`;
  const created = await createWarningDef({
    slug,
    label: label.slice(0, 120),
    category,
    points,
    desks,
    note,
    isSystem: false,
    sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 1000,
  });
  return withMerit(created);
}

async function updateWarningDefService(warningDefId, body) {
  const current = await getWarningDefById(warningDefId);
  if (!current) throw serviceError('Warning not found.', 404);
  const updated = await updateWarningDef(warningDefId, {
    label: body?.label != null ? String(body.label).trim().slice(0, 120) : undefined,
    category: body?.category != null ? normalizeCategory(body.category) : undefined,
    points: body?.points != null ? clampWarningPoints(body.points) : undefined,
    desks: body?.desks != null ? normalizeDesks(body.desks) : undefined,
    note: body?.note != null ? String(body.note).trim().slice(0, 500) : undefined,
    sortOrder: body?.sortOrder != null ? Number(body.sortOrder) : undefined,
  });
  if (!updated) throw serviceError('Warning not found.', 404);
  return withMerit(updated);
}

async function deleteWarningDefService(warningDefId) {
  const current = await getWarningDefById(warningDefId);
  if (!current) throw serviceError('Warning not found.', 404);
  await softDeleteWarningDef(warningDefId);
  return { warning_def_id: warningDefId, deleted: true };
}

module.exports = {
  ALLOWED_DESKS,
  ALLOWED_CATEGORIES,
  listWarningCatalog,
  listWarningDefsService,
  resolveIssuedWarning,
  createWarningDefService,
  updateWarningDefService,
  deleteWarningDefService,
};
