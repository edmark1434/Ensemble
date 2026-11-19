/**
 * Platform Merit punishment ladder.
 *
 * Merit is `100 − active warning points` and is never changed by a punishment. Each threshold
 * row says "when merit drops to this level, apply this punishment for N days". It starts once
 * per crossing (a warning that takes the member from above the row to at or below it), runs its
 * full clock, and does not end when warnings expire, are lifted, or merit recovers. A deeper
 * drop crosses a harsher row. Running punishments live in `merit_penalties`
 * (MeritPenaltyServices); this file holds the rules and the per-band action matrix.
 */
const DEFAULT_MERIT = 100;
const MIN_WARNING_POINTS = 1;
const MAX_WARNING_POINTS = 10;
const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 365;
const WARNING_DURATION_DAYS = [3, 5, 7, 10, 14, 21, 30, 45, 60, 90];
const RESTRICTED_PROPOSAL_DAILY_CAP = 3;
/** Lowest seeded auto-suspend trigger, still sent with warning notices. */
const AUTO_SUSPEND_POINTS = 20;
const AUTO_SUSPEND_DAYS = 7;
/** A row can trigger anywhere from merit 99 (1 point) down to merit 0 (100 points). */
const MIN_TRIGGER_POINTS = 1;
const MAX_TRIGGER_POINTS = DEFAULT_MERIT;

/** Product bands: each one turns off a set of actions (ACTION_ALLOW). */
const BAND_EFFECTS = ['limited', 'restricted', 'frozen'];
/** Every punishment a threshold row can apply. */
const PENALTY_EFFECTS = [...BAND_EFFECTS, 'mute', 'auto_suspend'];
const THRESHOLD_EFFECTS = PENALTY_EFFECTS;
/** Ids the action matrix understands; `none` means no band is running. */
const PRODUCT_BAND_IDS = ['none', 'record', ...BAND_EFFECTS];
const BAND_SEVERITY = { none: 0, record: 0, limited: 1, restricted: 2, frozen: 3 };

const EFFECT_LABELS = {
  limited: 'Limited',
  restricted: 'Restricted',
  frozen: 'Frozen access',
  mute: 'Mute',
  auto_suspend: 'Suspension',
};

const DEFAULT_PENALTY_DAYS = { limited: 3, restricted: 5, frozen: 7, mute: 3, auto_suspend: 7 };

/** How a running band reads inside a sentence ("while Restricted access runs"). */
const BAND_PHRASES = { limited: 'Limited access', restricted: 'Restricted access', frozen: 'Frozen access' };

const NO_BAND = Object.freeze({ id: 'none', min: 0, max: 0, label: 'Clear', endsAt: null });

/**
 * The live ladder seeded by `1829300000000_timed-merit-punishments` (and the fallback when the
 * table cannot be read). Merit = 100 − minPoints.
 */
const DEFAULT_PUNISHMENT_LADDER = Object.freeze([
  { minPoints: 3, effect: 'limited', label: 'Limited 3 days', durationDays: 3 },
  { minPoints: 8, effect: 'restricted', label: 'Restricted 5 days', durationDays: 5 },
  { minPoints: 10, effect: 'mute', label: 'Mute 3 days', durationDays: 3 },
  { minPoints: 15, effect: 'mute', label: 'Mute 5 days', durationDays: 5 },
  { minPoints: 16, effect: 'frozen', label: 'Frozen access 7 days', durationDays: 7 },
  { minPoints: 20, effect: 'auto_suspend', label: 'Auto-suspend 7 days', durationDays: 7 },
  { minPoints: 30, effect: 'auto_suspend', label: 'Auto-suspend 14 days', durationDays: 14 },
]);

/**
 * The original ladder, kept exactly as `1826600000000_warning-duration-and-thresholds` seeds it
 * so that migration still runs on a fresh database. Runtime code uses DEFAULT_PUNISHMENT_LADDER.
 */
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

/** What a mute turns off. Existing job, gig and contract threads stay open (live work). */
const MUTE_ACTIONS = new Set(['forum_write', 'asset_comment', 'new_dm']);

const ACTION_MESSAGES = {
  create_job: 'Posting a new job is paused while an automatic merit punishment runs.',
  create_urgent_job: 'Urgent job posts are paused while an automatic merit punishment runs.',
  create_gig: 'Creating a new gig is paused while an automatic merit punishment runs.',
  publish_asset: 'Publishing a marketplace listing is paused while an automatic merit punishment runs.',
  asset_comment: 'Commenting on marketplace listings is paused while an automatic merit punishment runs.',
  proposal: 'Sending job proposals is paused while an automatic merit punishment runs.',
  proposal_cap: `You can send ${RESTRICTED_PROPOSAL_DAILY_CAP} job proposals per day while Restricted access runs.`,
  forum_write: 'Forum posting is paused while an automatic merit punishment runs. You can still read.',
  new_dm: 'Starting new conversations is paused while an automatic merit punishment runs. Existing job, gig, and contract threads stay open.',
  cashout: 'Cashout is paused while an automatic merit punishment runs. Your balance is not seized.',
  create_team: 'Creating a team is paused while an automatic merit punishment runs.',
  join_team: 'Joining a new team is paused while an automatic merit punishment runs. Teams you already belong to stay open.',
  create_shared_project: 'Starting a new shared editor project is paused while an automatic merit punishment runs. Personal projects and live team work stay open.',
};

const MUTE_MESSAGES = {
  forum_write: 'You are muted, so forum posting is paused. You can still read.',
  asset_comment: 'You are muted, so commenting on marketplace listings is paused.',
  new_dm: 'You are muted, so starting new conversations is paused. Existing job, gig, and contract threads stay open.',
};

function formatEnds(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

/** "… paused while Restricted access runs (until Nov 24, 2026, 3:00 PM)." */
function bandActionMessage(action, band) {
  const base = ACTION_MESSAGES[action] || 'An automatic merit punishment does not allow this action.';
  const when = formatEnds(band?.endsAt);
  const name = band?.id && band.id !== 'none' ? BAND_PHRASES[band.id] || band.label : null;
  if (!name) return base;
  const named = base.replace('an automatic merit punishment runs', `${name} runs`);
  return when ? named.replace(/\.(\s|$)/, ` (until ${when}).$1`) : named;
}

function muteActionMessage(action, mute) {
  const base = MUTE_MESSAGES[action] || 'You are muted.';
  const when = formatEnds(mute?.endsAt);
  return when ? base.replace('You are muted', `You are muted until ${when}`) : base;
}

function meritFromWarningPoints(points) {
  const n = Math.max(0, Math.round(Number(points) || 0));
  if (!Number.isFinite(n)) return DEFAULT_MERIT;
  return Math.max(0, Math.min(DEFAULT_MERIT, DEFAULT_MERIT - n));
}

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

function effectLabel(effect) {
  return EFFECT_LABELS[effect] || String(effect || 'Punishment');
}

/**
 * Rows that punish, sorted down the ladder. Retired `none` / `record` rows are dropped. Before
 * the timed-punishment migration, rows carry `suspend_days` (auto-suspend only); bands then
 * fall back to their default length.
 */
function normalizeThresholdRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((row) => {
      const effect = String(row.effect || '').trim().toLowerCase();
      const rawDays = row.durationDays ?? row.duration_days ?? row.suspendDays ?? row.suspend_days;
      return {
        id: row.warning_threshold_id || row.id || null,
        minPoints: Math.max(0, Math.round(Number(row.minPoints ?? row.min_points) || 0)),
        effect,
        label: String(row.label || '').trim() || effectLabel(effect),
        durationDays: clampDurationDays(rawDays, DEFAULT_PENALTY_DAYS[effect] || 7),
      };
    })
    .filter((row) => PENALTY_EFFECTS.includes(row.effect) && row.minPoints >= MIN_TRIGGER_POINTS)
    .sort((a, b) => a.minPoints - b.minPoints || a.effect.localeCompare(b.effect));
}

function setLiveThresholds(rows) {
  const normalized = normalizeThresholdRows(rows);
  // An admin may delete every row: that means no automatic punishments, not the seed.
  liveThresholds = Array.isArray(rows) ? normalized : normalizeThresholdRows(DEFAULT_PUNISHMENT_LADDER);
  liveThresholdsAt = Date.now();
  return liveThresholds;
}

function getLiveThresholds() {
  return liveThresholds || normalizeThresholdRows(DEFAULT_PUNISHMENT_LADDER);
}

function thresholdsAreFresh() {
  return Boolean(liveThresholds) && Date.now() - liveThresholdsAt < THRESHOLD_CACHE_MS;
}

function resolveThresholds(rows) {
  if (Array.isArray(rows) && rows.length) return normalizeThresholdRows(rows);
  return getLiveThresholds();
}

/**
 * Rows a jump from `pointsBefore` to `pointsAfter` active points crosses: the member was above
 * the row's merit and is now at or below it. One per effect: the longest punishment wins (ties
 * go to the row further down the ladder), since a longer one of the same kind covers a shorter.
 */
function rulesCrossed(pointsBefore, pointsAfter, thresholdRows) {
  const before = Math.max(0, Number(pointsBefore) || 0);
  const after = Math.max(0, Number(pointsAfter) || 0);
  if (after <= before) return [];
  const byEffect = new Map();
  for (const row of resolveThresholds(thresholdRows)) {
    if (row.minPoints <= before || row.minPoints > after) continue;
    const current = byEffect.get(row.effect);
    if (
      !current ||
      row.durationDays > current.durationDays ||
      (row.durationDays === current.durationDays && row.minPoints > current.minPoints)
    ) {
      byEffect.set(row.effect, row);
    }
  }
  return [...byEffect.values()].sort((a, b) => a.minPoints - b.minPoints);
}

/**
 * Before the timed-punishment migration there is nowhere to keep a clock, so bands still follow
 * active points live. Not used once `merit_penalties` exists.
 */
function bandForPoints(points, thresholdRows) {
  const n = Math.max(0, Number(points) || 0);
  let best = null;
  for (const row of resolveThresholds(thresholdRows)) {
    if (!BAND_EFFECTS.includes(row.effect) || n < row.minPoints) continue;
    if (!best || BAND_SEVERITY[row.effect] > BAND_SEVERITY[best.effect]) best = row;
  }
  if (!best) return { ...NO_BAND };
  return { id: best.effect, min: best.minPoints, max: 9999, label: effectLabel(best.effect), endsAt: null };
}

/**
 * The band in force from running punishments: the strictest one. Its `endsAt` is when that
 * band ends; a milder band that is still running then takes over.
 * @param {{ effect: string, endsAt: Date|string, minPoints?: number }[]} penalties
 */
function bandFromPenalties(penalties) {
  let best = null;
  for (const penalty of penalties || []) {
    if (!BAND_EFFECTS.includes(penalty.effect)) continue;
    const severity = BAND_SEVERITY[penalty.effect];
    if (
      !best ||
      severity > BAND_SEVERITY[best.effect] ||
      (severity === BAND_SEVERITY[best.effect] && new Date(penalty.endsAt) > new Date(best.endsAt))
    ) {
      best = penalty;
    }
  }
  if (!best) return { ...NO_BAND };
  return {
    id: best.effect,
    min: Number(best.minPoints) || 0,
    max: 9999,
    label: effectLabel(best.effect),
    endsAt: best.endsAt || null,
  };
}

function actionAllowed(action, bandId) {
  const matrix = ACTION_ALLOW[action];
  if (!matrix) return true;
  return matrix[bandId] !== false;
}

function warningBandError(message, code = 'WARNING_RESTRICTED', statusCode = 403) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function refreshLiveThresholds() {
  if (thresholdsAreFresh()) return getLiveThresholds();
  try {
    const { listWarningThresholds } = require('../repositories/WarningThresholdRepositories');
    const rows = await listWarningThresholds();
    return setLiveThresholds(rows);
  } catch (err) {
    if (!liveThresholds) setLiveThresholds(DEFAULT_PUNISHMENT_LADDER);
    return getLiveThresholds();
  }
}

module.exports = {
  DEFAULT_MERIT,
  MIN_WARNING_POINTS,
  MAX_WARNING_POINTS,
  MIN_DURATION_DAYS,
  MAX_DURATION_DAYS,
  MIN_TRIGGER_POINTS,
  MAX_TRIGGER_POINTS,
  WARNING_DURATION_DAYS,
  RESTRICTED_PROPOSAL_DAILY_CAP,
  AUTO_SUSPEND_POINTS,
  AUTO_SUSPEND_DAYS,
  BAND_EFFECTS,
  PENALTY_EFFECTS,
  PRODUCT_BAND_IDS,
  THRESHOLD_EFFECTS,
  BAND_SEVERITY,
  EFFECT_LABELS,
  DEFAULT_PENALTY_DAYS,
  NO_BAND,
  DEFAULT_PUNISHMENT_LADDER,
  DEFAULT_THRESHOLDS,
  ACTION_MESSAGES,
  MUTE_ACTIONS,
  bandActionMessage,
  muteActionMessage,
  meritFromWarningPoints,
  clampWarningPoints,
  clampDurationDays,
  warningDurationDays,
  effectLabel,
  rulesCrossed,
  bandForPoints,
  bandFromPenalties,
  actionAllowed,
  warningBandError,
  setLiveThresholds,
  getLiveThresholds,
  refreshLiveThresholds,
};
