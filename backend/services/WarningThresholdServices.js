const {
  listWarningThresholds,
  getWarningThresholdById,
  getWarningThresholdByMinPoints,
  createWarningThreshold,
  updateWarningThreshold,
  softDeleteWarningThreshold,
} = require('../repositories/WarningThresholdRepositories');
const {
  THRESHOLD_EFFECTS,
  PRODUCT_BAND_IDS,
  DEFAULT_THRESHOLDS,
  DEFAULT_MERIT,
  clampDurationDays,
  setLiveThresholds,
} = require('../lib/WarningBands');

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEffect(effect) {
  const value = String(effect || '').trim().toLowerCase();
  if (!THRESHOLD_EFFECTS.includes(value)) {
    throw serviceError('Pick a threshold effect: record, limited, restricted, frozen, or auto-suspend.');
  }
  return value;
}

function normalizeMinPoints(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0 || n > 9999) {
    throw serviceError('Minimum warning points must be between 0 and 9999.');
  }
  return n;
}

function normalizeLabel(label, effect) {
  const value = String(label || '').trim().slice(0, 80);
  if (value) return value;
  if (effect === 'auto_suspend') return 'Auto-suspend';
  if (effect === 'none') return 'Clear';
  if (effect === 'frozen') return 'Frozen access';
  return effect.charAt(0).toUpperCase() + effect.slice(1);
}

function normalizeSuspendDays(effect, suspendDays) {
  if (effect !== 'auto_suspend') return null;
  if (suspendDays == null || suspendDays === '') {
    throw serviceError('Auto-suspend needs how many days it lasts.');
  }
  return clampDurationDays(suspendDays, 7);
}

function hasOwn(body, key) {
  return Boolean(body) && Object.prototype.hasOwnProperty.call(body, key);
}

/**
 * Merit at which an auto-suspension ends early. Empty means it always runs its full clock.
 * It must sit above the merit the suspension starts at, or it would lift straight away.
 */
function normalizeLiftAtMerit(effect, value, minPoints) {
  if (effect !== 'auto_suspend') return null;
  if (value == null || value === '') return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > DEFAULT_MERIT) {
    throw serviceError(`Early lift merit must be between 1 and ${DEFAULT_MERIT}, or empty to keep the full suspension.`);
  }
  const startsAtMerit = Math.max(0, DEFAULT_MERIT - minPoints);
  if (n <= startsAtMerit) {
    throw serviceError(
      `This auto-suspend starts at ${startsAtMerit} merit (${minPoints} warning points), so the early lift must be above ${startsAtMerit}.`
    );
  }
  return n;
}

function liftAtMeritFromBody(body) {
  if (hasOwn(body, 'liftAtMerit')) return body.liftAtMerit;
  if (hasOwn(body, 'lift_at_merit')) return body.lift_at_merit;
  return undefined;
}

async function listWarningThresholdsService() {
  try {
    const rows = await listWarningThresholds();
    if (rows.length) {
      setLiveThresholds(rows);
      return rows;
    }
  } catch (err) {
    console.warn('warning_thresholds lookup failed, using built-in ladder:', err.message);
  }
  return DEFAULT_THRESHOLDS.map((row, index) => ({
    warning_threshold_id: `seed-${row.effect}-${row.minPoints}`,
    ...row,
    min_points: row.minPoints,
    suspend_days: row.suspendDays,
    lift_at_merit: row.liftAtMerit,
    note: '',
    is_system: true,
    sort_order: index,
  }));
}

async function createWarningThresholdService(body) {
  const minPoints = normalizeMinPoints(body?.minPoints ?? body?.min_points);
  const effect = normalizeEffect(body?.effect);
  const label = normalizeLabel(body?.label, effect);
  const suspendDays = normalizeSuspendDays(effect, body?.suspendDays ?? body?.suspend_days);
  const liftAtMerit = normalizeLiftAtMerit(effect, liftAtMeritFromBody(body), minPoints);
  const note = String(body?.note || '').trim().slice(0, 500);
  const existing = await getWarningThresholdByMinPoints(minPoints);
  if (existing) {
    throw serviceError(`A threshold already starts at ${minPoints} active warning points.`);
  }
  const created = await createWarningThreshold({
    minPoints,
    effect,
    label,
    suspendDays,
    liftAtMerit,
    note,
    isSystem: false,
    sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : minPoints,
  });
  const rows = await listWarningThresholds();
  setLiveThresholds(rows);
  return created;
}

async function updateWarningThresholdService(thresholdId, body) {
  const current = await getWarningThresholdById(thresholdId);
  if (!current) throw serviceError('Threshold not found.', 404);
  const effect = body?.effect != null ? normalizeEffect(body.effect) : current.effect;
  const minPoints = body?.minPoints != null || body?.min_points != null
    ? normalizeMinPoints(body?.minPoints ?? body?.min_points)
    : current.minPoints;
  if (minPoints !== current.minPoints) {
    const clash = await getWarningThresholdByMinPoints(minPoints);
    if (clash && clash.warning_threshold_id !== thresholdId) {
      throw serviceError(`A threshold already starts at ${minPoints} active warning points.`);
    }
  }
  const suspendSource = body?.suspendDays ?? body?.suspend_days;
  // Re-check the lift whenever it, the effect, or the trigger point moves.
  const liftSource = liftAtMeritFromBody(body);
  const liftChanged = liftSource !== undefined || body?.effect != null || minPoints !== current.minPoints;
  const liftAtMerit = liftChanged
    ? normalizeLiftAtMerit(effect, liftSource === undefined ? current.liftAtMerit : liftSource, minPoints)
    : undefined;
  const updated = await updateWarningThreshold(thresholdId, {
    liftAtMerit,
    minPoints,
    effect,
    label: body?.label != null ? normalizeLabel(body.label, effect) : undefined,
    suspendDays: body?.suspendDays !== undefined || body?.suspend_days !== undefined || body?.effect != null
      ? normalizeSuspendDays(effect, suspendSource == null ? current.suspendDays : suspendSource)
      : undefined,
    note: body?.note != null ? String(body.note).trim().slice(0, 500) : undefined,
    sortOrder: body?.sortOrder != null ? Number(body.sortOrder) : undefined,
  });
  if (!updated) throw serviceError('Threshold not found.', 404);
  const rows = await listWarningThresholds();
  setLiveThresholds(rows);
  return updated;
}

async function deleteWarningThresholdService(thresholdId) {
  const current = await getWarningThresholdById(thresholdId);
  if (!current) throw serviceError('Threshold not found.', 404);
  const remaining = (await listWarningThresholds()).filter((row) => row.warning_threshold_id !== thresholdId);
  const remainingBands = remaining.filter((row) => PRODUCT_BAND_IDS.includes(row.effect));
  if (PRODUCT_BAND_IDS.includes(current.effect) && remainingBands.length === 0) {
    throw serviceError('Keep at least one product-limit threshold.');
  }
  await softDeleteWarningThreshold(thresholdId);
  setLiveThresholds(remaining);
  return { warning_threshold_id: thresholdId, deleted: true };
}

module.exports = {
  listWarningThresholdsService,
  createWarningThresholdService,
  updateWarningThresholdService,
  deleteWarningThresholdService,
};
