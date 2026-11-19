/**
 * Admin CRUD for the merit punishment ladder (`/admin/warnings` → Point thresholds).
 *
 * Each row: when Platform Merit drops to `100 − minPoints` or lower, apply `effect` for
 * `durationDays`. The punishment runs its full clock; merit recovering does not end it. Edits
 * only affect punishments that start afterwards, the same way a warning keeps its catalog clock.
 */
const {
  listWarningThresholds,
  getWarningThresholdById,
  getWarningThresholdByTrigger,
  createWarningThreshold,
  updateWarningThreshold,
  softDeleteWarningThreshold,
} = require('../repositories/WarningThresholdRepositories');
const {
  PENALTY_EFFECTS,
  DEFAULT_PUNISHMENT_LADDER,
  DEFAULT_PENALTY_DAYS,
  MIN_TRIGGER_POINTS,
  MAX_TRIGGER_POINTS,
  MIN_DURATION_DAYS,
  MAX_DURATION_DAYS,
  effectLabel,
  setLiveThresholds,
} = require('../lib/WarningBands');

function serviceError(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

async function assertTimedPunishmentsReady() {
  const { thresholdDurationReady } = require('../lib/SchemaFeatures');
  if (!(await thresholdDurationReady())) {
    throw serviceError(
      'Timed punishments need the latest database migration. Run `pnpm migrate` on the backend, then try again.',
      503,
      'MERIT_PENALTIES_UNAVAILABLE'
    );
  }
}

function normalizeEffect(effect) {
  const value = String(effect || '').trim().toLowerCase();
  if (!PENALTY_EFFECTS.includes(value)) {
    throw serviceError('Pick a punishment: Limited, Restricted, Frozen access, Mute, or Suspension.');
  }
  return value;
}

/** Accepts `minPoints`, or `triggerMerit` (the merit level, 0–99) which maps to 100 − merit. */
function triggerFromBody(body) {
  if (body?.minPoints != null || body?.min_points != null) return body?.minPoints ?? body?.min_points;
  if (body?.triggerMerit != null || body?.trigger_merit != null) {
    const merit = Number(body?.triggerMerit ?? body?.trigger_merit);
    return Number.isFinite(merit) ? 100 - Math.round(merit) : NaN;
  }
  return undefined;
}

function normalizeMinPoints(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < MIN_TRIGGER_POINTS || n > MAX_TRIGGER_POINTS) {
    throw serviceError(
      `Pick a merit level from ${100 - MAX_TRIGGER_POINTS} to ${100 - MIN_TRIGGER_POINTS} (${MIN_TRIGGER_POINTS}–${MAX_TRIGGER_POINTS} warning points).`
    );
  }
  return n;
}

function normalizeDurationDays(value) {
  if (value == null || value === '') throw serviceError('Say how many days the punishment lasts.');
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < MIN_DURATION_DAYS || n > MAX_DURATION_DAYS) {
    throw serviceError(`A punishment lasts ${MIN_DURATION_DAYS}–${MAX_DURATION_DAYS} days.`);
  }
  return n;
}

function defaultLabel(effect, days) {
  const name = effect === 'auto_suspend' ? 'Auto-suspend' : effectLabel(effect);
  return `${name} ${days} day${days === 1 ? '' : 's'}`;
}

function normalizeLabel(label, effect, days) {
  const value = String(label || '').trim().slice(0, 80);
  return value || defaultLabel(effect, days);
}

function durationFromBody(body) {
  return body?.durationDays ?? body?.duration_days ?? body?.suspendDays ?? body?.suspend_days;
}

async function assertTriggerFree(minPoints, effect, exceptId = null) {
  const clash = await getWarningThresholdByTrigger(minPoints, effect);
  if (clash && clash.warning_threshold_id !== exceptId) {
    throw serviceError(
      `A ${effectLabel(effect)} row already starts at merit ${100 - minPoints}. Edit that row, or pick another level.`,
      409
    );
  }
}

async function reloadLive() {
  setLiveThresholds(await listWarningThresholds());
}

async function listWarningThresholdsService() {
  try {
    const rows = await listWarningThresholds();
    setLiveThresholds(rows);
    return rows;
  } catch (err) {
    console.warn('warning_thresholds lookup failed, using built-in ladder:', err.message);
  }
  return DEFAULT_PUNISHMENT_LADDER.map((row, index) => ({
    warning_threshold_id: `seed-${row.effect}-${row.minPoints}`,
    ...row,
    min_points: row.minPoints,
    triggerMerit: 100 - row.minPoints,
    duration_days: row.durationDays,
    note: '',
    is_system: true,
    sort_order: index,
  }));
}

async function createWarningThresholdService(body) {
  await assertTimedPunishmentsReady();
  const minPoints = normalizeMinPoints(triggerFromBody(body));
  const effect = normalizeEffect(body?.effect);
  const durationDays = normalizeDurationDays(durationFromBody(body) ?? DEFAULT_PENALTY_DAYS[effect]);
  const label = normalizeLabel(body?.label, effect, durationDays);
  const note = String(body?.note || '').trim().slice(0, 500);
  await assertTriggerFree(minPoints, effect);
  const created = await createWarningThreshold({
    minPoints,
    effect,
    label,
    durationDays,
    note,
    isSystem: false,
    sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : minPoints,
  });
  await reloadLive();
  return created;
}

async function updateWarningThresholdService(thresholdId, body) {
  await assertTimedPunishmentsReady();
  const current = await getWarningThresholdById(thresholdId);
  if (!current) throw serviceError('Threshold not found.', 404);
  const effect = body?.effect != null ? normalizeEffect(body.effect) : current.effect;
  const trigger = triggerFromBody(body);
  const minPoints = trigger !== undefined ? normalizeMinPoints(trigger) : current.minPoints;
  if (minPoints !== current.minPoints || effect !== current.effect) {
    await assertTriggerFree(minPoints, effect, current.warning_threshold_id);
  }
  const rawDays = durationFromBody(body);
  const durationDays = rawDays !== undefined ? normalizeDurationDays(rawDays) : undefined;
  const updated = await updateWarningThreshold(thresholdId, {
    minPoints,
    effect,
    label: body?.label != null
      ? normalizeLabel(body.label, effect, durationDays ?? current.durationDays ?? DEFAULT_PENALTY_DAYS[effect])
      : undefined,
    durationDays,
    note: body?.note != null ? String(body.note).trim().slice(0, 500) : undefined,
    sortOrder: body?.sortOrder != null ? Number(body.sortOrder) : undefined,
  });
  if (!updated) throw serviceError('Threshold not found.', 404);
  await reloadLive();
  return updated;
}

/** Removing a row stops it starting new punishments; ones already running keep their clock. */
async function deleteWarningThresholdService(thresholdId) {
  const current = await getWarningThresholdById(thresholdId);
  if (!current) throw serviceError('Threshold not found.', 404);
  await softDeleteWarningThreshold(thresholdId);
  await reloadLive();
  return { warning_threshold_id: thresholdId, deleted: true };
}

module.exports = {
  listWarningThresholdsService,
  createWarningThresholdService,
  updateWarningThresholdService,
  deleteWarningThresholdService,
};
