const MIN_WARNING_POINTS = 1;
const MAX_WARNING_POINTS = 10;
const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 365;
const WARNING_DURATION_DAYS = [3, 5, 7, 10, 14, 21, 30, 45, 60, 90];
const RESTRICTED_PROPOSAL_DAILY_CAP = 3;
const AUTO_SUSPEND_POINTS = 20;
const AUTO_SUSPEND_LONG_POINTS = 30;
const AUTO_SUSPEND_DAYS = 7;
const AUTO_SUSPEND_LONG_DAYS = 14;

const PRODUCT_BAND_IDS = ['none', 'record', 'limited', 'restricted', 'frozen'];
const THRESHOLD_EFFECTS = [...PRODUCT_BAND_IDS, 'auto_suspend'];

const BANDS = [
  { id: 'none', min: 0, max: 0, label: 'Clear' },
  { id: 'record', min: 1, max: 2, label: 'Record' },
  { id: 'limited', min: 3, max: 7, label: 'Limited' },
  { id: 'restricted', min: 8, max: 15, label: 'Restricted' },
  { id: 'frozen', min: 16, max: 9999, label: 'Frozen access' },
];

const DEFAULT_THRESHOLDS = Object.freeze([
  { minPoints: 0, effect: 'none', label: 'Clear', suspendDays: null },
  { minPoints: 1, effect: 'record', label: 'Record', suspendDays: null },
  { minPoints: 3, effect: 'limited', label: 'Limited', suspendDays: null },
  { minPoints: 8, effect: 'restricted', label: 'Restricted', suspendDays: null },
  { minPoints: 16, effect: 'frozen', label: 'Frozen access', suspendDays: null },
  { minPoints: 20, effect: 'auto_suspend', label: 'Auto-suspend 7 days', suspendDays: 7 },
  { minPoints: 30, effect: 'auto_suspend', label: 'Auto-suspend 14 days', suspendDays: 14 },
]);

const ACTION_ALLOW = {
  create_job: { none: true, record: true, limited: true, restricted: false, frozen: false },
  create_urgent_job: { none: true, record: true, limited: false, restricted: false, frozen: false },
  create_gig: { none: true, record: true, limited: true, restricted: false, frozen: false },
  publish_asset: { none: true, record: true, limited: true, restricted: false, frozen: false },
  asset_comment: { none: true, record: true, limited: true, restricted: false, frozen: false },
  proposal: { none: true, record: true, limited: true, restricted: true, frozen: false },
  forum_write: { none: true, record: true, limited: true, restricted: false, frozen: false },
  new_dm: { none: true, record: true, limited: true, restricted: true, frozen: false },
  cashout: { none: true, record: true, limited: true, restricted: true, frozen: false },
  create_team: { none: true, record: true, limited: true, restricted: false, frozen: false },
  join_team: { none: true, record: true, limited: true, restricted: false, frozen: false },
  create_shared_project: { none: true, record: true, limited: true, restricted: false, frozen: false },
};

const ACTION_MESSAGES = {
  create_job: 'Active warnings are too high to post a new job. Finish live work or wait for warnings to expire.',
  create_urgent_job: 'Urgent job posts are blocked while a Limited warning threshold is in effect.',
  create_gig: 'Active warnings are too high to create a new gig.',
  publish_asset: 'Active warnings are too high to publish a marketplace listing.',
  asset_comment: 'Active warnings are too high to comment on marketplace listings.',
  proposal: 'Frozen-access accounts cannot send job proposals.',
  proposal_cap: `Restricted accounts can send ${RESTRICTED_PROPOSAL_DAILY_CAP} job proposals per day.`,
  forum_write: 'Active warnings are too high to post in the forums. You can still read.',
  new_dm: 'Frozen-access accounts cannot start new messages. Existing job, gig, and contract threads stay open.',
  cashout: 'Cashout is blocked while Frozen access is in effect. Your balance is not seized.',
  create_team: 'Active warnings are too high to create a team.',
  join_team: 'Active warnings are too high to join a new team. Teams you already belong to stay open.',
  create_shared_project: 'Active warnings are too high to start a new shared editor project. Personal projects and live team work stay open.',
};

let liveThresholds = null;
let liveThresholdsAt = 0;
const THRESHOLD_CACHE_MS = 15000;

function clampWarningPoints(points) {
  const n = Math.round(Number(points));
  if (!Number.isFinite(n)) return MIN_WARNING_POINTS;
  return Math.max(MIN_WARNING_POINTS, Math.min(MAX_WARNING_POINTS, n));
}

function clampDurationDays(days, fallback = 14) {
  const n = Math.round(Number(days));
  if (!Number.isFinite(n) || n < MIN_DURATION_DAYS) {
    const fb = Math.round(Number(fallback));
    return Number.isFinite(fb) && fb >= MIN_DURATION_DAYS
      ? Math.min(MAX_DURATION_DAYS, fb)
      : 14;
  }
  return Math.max(MIN_DURATION_DAYS, Math.min(MAX_DURATION_DAYS, n));
}

function warningDurationDays(points) {
  return WARNING_DURATION_DAYS[clampWarningPoints(points) - 1];
}

function normalizeThresholdRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((row) => ({
      minPoints: Math.max(0, Math.round(Number(row.minPoints ?? row.min_points) || 0)),
      effect: String(row.effect || '').trim().toLowerCase(),
      label: String(row.label || '').trim() || String(row.effect || 'Threshold'),
      suspendDays: row.suspendDays != null || row.suspend_days != null
        ? clampDurationDays(row.suspendDays ?? row.suspend_days, 7)
        : null,
    }))
    .filter((row) => THRESHOLD_EFFECTS.includes(row.effect))
    .sort((a, b) => a.minPoints - b.minPoints || a.effect.localeCompare(b.effect));
}

function setLiveThresholds(rows) {
  const normalized = normalizeThresholdRows(rows);
  liveThresholds = normalized.length ? normalized : [...DEFAULT_THRESHOLDS];
  liveThresholdsAt = Date.now();
  return liveThresholds;
}

function getLiveThresholds() {
  if (liveThresholds && Date.now() - liveThresholdsAt < THRESHOLD_CACHE_MS) {
    return liveThresholds;
  }
  return liveThresholds || [...DEFAULT_THRESHOLDS];
}

function thresholdsAreFresh() {
  return Boolean(liveThresholds) && Date.now() - liveThresholdsAt < THRESHOLD_CACHE_MS;
}

function resolveThresholds(rows) {
  if (Array.isArray(rows) && rows.length) return normalizeThresholdRows(rows);
  return getLiveThresholds();
}

function bandForPoints(points, thresholdRows) {
  const n = Math.max(0, Number(points) || 0);
  const rows = resolveThresholds(thresholdRows).filter((row) => PRODUCT_BAND_IDS.includes(row.effect));
  const match = [...rows].reverse().find((row) => n >= row.minPoints);
  if (!match) return BANDS[0];
  return {
    id: match.effect,
    min: match.minPoints,
    max: 9999,
    label: match.label,
  };
}

function actionAllowed(action, bandId) {
  const matrix = ACTION_ALLOW[action];
  if (!matrix) return true;
  return matrix[bandId] !== false;
}

function warningBandError(message, code = 'WARNING_RESTRICTED') {
  const error = new Error(message);
  error.statusCode = 403;
  error.code = code;
  return error;
}

function autoSuspendDaysForPoints(points, thresholdRows) {
  const n = Math.max(0, Number(points) || 0);
  const rows = resolveThresholds(thresholdRows).filter((row) => row.effect === 'auto_suspend');
  const match = [...rows].reverse().find((row) => n >= row.minPoints);
  if (match) return match.suspendDays || AUTO_SUSPEND_DAYS;
  return 0;
}

async function refreshLiveThresholds() {
  if (thresholdsAreFresh()) return getLiveThresholds();
  try {
    const { listWarningThresholds } = require('../repositories/WarningThresholdRepositories');
    const rows = await listWarningThresholds();
    return setLiveThresholds(rows);
  } catch (err) {
    if (!liveThresholds) setLiveThresholds(DEFAULT_THRESHOLDS);
    return getLiveThresholds();
  }
}

module.exports = {
  MIN_WARNING_POINTS,
  MAX_WARNING_POINTS,
  MIN_DURATION_DAYS,
  MAX_DURATION_DAYS,
  WARNING_DURATION_DAYS,
  RESTRICTED_PROPOSAL_DAILY_CAP,
  AUTO_SUSPEND_POINTS,
  AUTO_SUSPEND_LONG_POINTS,
  AUTO_SUSPEND_DAYS,
  AUTO_SUSPEND_LONG_DAYS,
  BANDS,
  PRODUCT_BAND_IDS,
  THRESHOLD_EFFECTS,
  DEFAULT_THRESHOLDS,
  ACTION_MESSAGES,
  clampWarningPoints,
  clampDurationDays,
  warningDurationDays,
  bandForPoints,
  actionAllowed,
  warningBandError,
  autoSuspendDaysForPoints,
  setLiveThresholds,
  getLiveThresholds,
  refreshLiveThresholds,
};
