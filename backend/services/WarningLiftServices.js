/**
 * Lifting warning points: staff hand back Platform Merit without deleting the warnings behind
 * it. A lift only changes merit. Automatic punishments already running (Limited, Restricted,
 * Frozen access, Mute, Suspension) keep their own clocks; staff end those separately ("End
 * early" on the punishment, or Unsuspend for a suspension). Raising merit above a threshold
 * row's level means a later drop past it starts that punishment again.
 *
 * Rescind (one whole warning) and pardon (everything, plus standing) stay as they were.
 */
const { pool } = require('../lib/Database');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { sumActiveWarningPoints } = require('../repositories/WarningBandRepositories');
const { lockActiveWarnings, applyWarningLift } = require('../repositories/WarningLiftRepositories');
const {
  DEFAULT_MERIT,
  effectLabel,
  meritFromWarningPoints,
  refreshLiveThresholds,
  getLiveThresholds,
} = require('../lib/WarningBands');

const REASON_MIN = 5;
const REASON_MAX = 1000;

function liftError(message, statusCode = 400, code = 'WARNING_LIFT_INVALID') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function wholeNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
}

/** Lifting needs `violations.points_original`; say so plainly until the migration has run. */
async function assertLiftAvailable() {
  const { warningLiftColumnsReady } = require('../lib/SchemaFeatures');
  if (!(await warningLiftColumnsReady())) {
    throw liftError(
      'Lifting warning points needs the latest database migration. Run `pnpm migrate` on the backend, then try again.',
      503,
      'WARNING_LIFT_UNAVAILABLE'
    );
  }
}

/**
 * Where a lift would take the member. One quick option per threshold level they are at or
 * below ("back above merit 85"), plus the full ladder so the desk can show which levels a lift
 * clears. Running punishments come along so staff see that a lift does not end them.
 */
async function getWarningLiftPreview(accountId) {
  await assertLiftAvailable();
  const { assertWarnableAccount } = require('./WarningBandServices');
  await assertWarnableAccount(accountId);
  await refreshLiveThresholds();

  const points = await sumActiveWarningPoints(accountId);
  const { getActiveMeritPunishments } = require('./MeritPenaltyServices');
  const punishments = await getActiveMeritPunishments(accountId).catch(() => ({ list: [] }));
  const ladder = getLiveThresholds().map((row) => ({
    minPoints: row.minPoints,
    triggerMerit: Math.max(0, DEFAULT_MERIT - row.minPoints),
    effect: row.effect,
    effectLabel: effectLabel(row.effect),
    label: row.label,
    durationDays: row.durationDays,
  }));

  // One option per level the member is at or below, deepest first; levels that share a
  // merit value collapse into one.
  const levels = [...new Set(ladder.filter((row) => points >= row.minPoints).map((row) => row.minPoints))]
    .sort((a, b) => b - a);
  const options = levels.map((minPoints) => {
    const targetPoints = minPoints - 1;
    const rows = ladder.filter((row) => row.minPoints === minPoints);
    return {
      id: `level:${minPoints}`,
      kind: 'level',
      label: `Back above merit ${DEFAULT_MERIT - minPoints}`,
      clears: rows.map((row) => row.label),
      liftPoints: points - targetPoints,
      targetMerit: meritFromWarningPoints(targetPoints),
    };
  });
  if (points > 0 && !options.some((option) => option.targetMerit === DEFAULT_MERIT)) {
    options.push({
      id: 'full',
      kind: 'full',
      label: 'Restore full merit',
      clears: [],
      liftPoints: points,
      targetMerit: DEFAULT_MERIT,
    });
  }

  return {
    accountId,
    points,
    merit: meritFromWarningPoints(points),
    punishments: punishments.list || [],
    options,
    ladder,
  };
}

/** How many points to take off: a fixed amount, or whatever reaches a target merit. */
function resolveLiftAmount({ points, targetMerit }, currentPoints) {
  const fixed = wholeNumber(points);
  const target = wholeNumber(targetMerit);
  if (fixed == null && target == null) {
    throw liftError('Say how many points to lift, or the Platform Merit to restore.');
  }
  if (fixed != null && target != null) {
    throw liftError('Send either points to lift or a target merit, not both.');
  }
  const currentMerit = meritFromWarningPoints(currentPoints);
  if (target != null) {
    if (Number.isNaN(target) || target < 1 || target > DEFAULT_MERIT) {
      throw liftError(`Target merit must be a whole number from 1 to ${DEFAULT_MERIT}.`);
    }
    if (target <= currentMerit) {
      throw liftError(`Platform Merit is already ${currentMerit}. Pick a target above that.`);
    }
    return Math.min(currentPoints, currentPoints - (DEFAULT_MERIT - target));
  }
  if (Number.isNaN(fixed) || fixed < 1) {
    throw liftError('Points to lift must be a whole number of at least 1.');
  }
  if (fixed > currentPoints) {
    throw liftError(`Only ${currentPoints} active warning point(s) can be lifted.`);
  }
  return fixed;
}

/** Take `amount` points off the warnings in order, recording what each one goes down to. */
function planLift(warnings, amount) {
  let remaining = amount;
  const plan = [];
  for (const warning of warnings) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, warning.weight);
    if (take <= 0) continue;
    plan.push({ ...warning, take, to: warning.weight - take });
    remaining -= take;
  }
  return plan;
}

async function notifyLift(accountId, { lifted, merit, running }) {
  const still = running
    ? ' Automatic punishments already running keep their end dates.'
    : '';
  try {
    const { createNotificationServices } = require('./NotificationServices');
    const notification = await createNotificationServices({
      account_id: accountId,
      message: `Staff lifted ${lifted} warning point${lifted === 1 ? '' : 's'} from your account. Your Platform Merit is now ${merit}.${still}`,
      is_read: false,
      reference_table: 'accounts',
      reference_prefix: 'WARNING_UP',
      reference_path: '/profile',
      reference_id: accountId,
    });
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io) {
      if (notification) io.to(String(accountId)).emit('notification', notification);
      // Clients refetch their standing on this; the payload carries no lock of its own.
      io.to(String(accountId)).emit('account:restricted', {
        band: null,
        points: DEFAULT_MERIT - merit,
      });
    }
  } catch (err) {
    console.warn('Warning lift notification failed:', err.message);
  }
}

/**
 * Lift warning points from a member account.
 * @param {string} accountId
 * @param {string} staffId
 * @param {{ points?: number, targetMerit?: number, violationId?: string|null, reason: string }} input
 */
async function liftWarningPoints(accountId, staffId, input = {}) {
  if (!staffId) throw liftError('Staff session required to lift warning points', 401);
  const reason = String(input.reason || '').trim();
  if (reason.length < REASON_MIN) {
    throw liftError(`Write why the points are lifted (at least ${REASON_MIN} characters). The member does not see it.`);
  }

  await assertLiftAvailable();
  const { assertWarnableAccount } = require('./WarningBandServices');
  await assertWarnableAccount(accountId);
  const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
  await assertCanSanctionTarget({ actorStaffId: staffId, targetAccountId: accountId, action: 'lift' });
  await refreshLiveThresholds();

  const violationId = input.violationId ? String(input.violationId) : null;
  const client = await pool.connect();
  let summary;
  try {
    await client.query('BEGIN');
    // Every active warning is locked so the totals cannot move under the lift.
    const allWarnings = await lockActiveWarnings(client, accountId);
    const before = allWarnings.reduce((sum, w) => sum + w.weight, 0);
    if (!before) throw liftError('This member has no active warning points to lift.', 409, 'WARNING_LIFT_NOTHING');

    const candidates = violationId
      ? allWarnings.filter((w) => String(w.violationId) === violationId || String(w.violationNumber) === violationId)
      : allWarnings;
    if (violationId && !candidates.length) throw liftError('Active warning not found.', 404, 'WARNING_NOT_FOUND');

    const amount = resolveLiftAmount(input, before);
    const available = candidates.reduce((sum, w) => sum + w.weight, 0);
    if (amount > available) {
      throw liftError(`That warning only has ${available} point(s) left to lift.`);
    }

    const plan = planLift(candidates, amount);
    const changed = [];
    for (const step of plan) {
      const row = await applyWarningLift(client, step.violationId, step.to);
      if (row) {
        changed.push({
          violationId: row.violation_id,
          violationNumber: row.violation_number,
          type: row.type,
          from: step.weight,
          to: step.to,
          originalPoints: row.points_original == null ? step.weight : Number(row.points_original),
          status: row.status,
        });
      }
    }

    const after = before - amount;
    summary = {
      accountId,
      lifted: amount,
      pointsBefore: before,
      pointsAfter: after,
      meritBefore: meritFromWarningPoints(before),
      meritAfter: meritFromWarningPoints(after),
      warnings: changed,
    };

    await recordAccountActivity({
      accountId,
      action: `Warning points lifted: ${amount} point(s), merit ${summary.meritBefore} → ${summary.meritAfter}`,
      eventCode: 'WARNING_POINTS_LIFTED',
      referenceTable: 'accounts',
      referencePrefix: 'ACC',
      referenceId: accountId,
      actorStaffId: staffId,
      metadata: {
        ...summary,
        reason,
        violationId: violationId || null,
      },
      client,
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const { getActiveMeritPunishments } = require('./MeritPenaltyServices');
  const punishments = await getActiveMeritPunishments(accountId).catch(() => ({ list: [] }));
  const running = punishments.list || [];
  await notifyLift(accountId, { lifted: summary.lifted, merit: summary.meritAfter, running: running.length > 0 });

  try {
    const { refreshWarningBand } = require('./WarningBandServices');
    await refreshWarningBand(accountId);
  } catch (err) {
    console.warn('Warning band refresh after lift failed:', err.message);
  }

  return { ...summary, punishmentsStillRunning: running };
}

module.exports = {
  getWarningLiftPreview,
  liftWarningPoints,
};
