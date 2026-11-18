/**
 * Lifting warning points: staff hand back Platform Merit without deleting the warnings behind
 * it. Product bands (Limited / Restricted / Frozen access) are worked out live from active
 * points, so they end as soon as a lift takes the member under a band's floor. An automatic
 * suspension ends once merit reaches the recovery level copied from its threshold.
 *
 * Rescind (one whole warning) and pardon (everything, plus standing) stay as they were.
 */
const { pool } = require('../lib/Database');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { sumActiveWarningPoints } = require('../repositories/WarningBandRepositories');
const { lockActiveWarnings, applyWarningLift } = require('../repositories/WarningLiftRepositories');
const {
  DEFAULT_MERIT,
  PRODUCT_BAND_IDS,
  bandForPoints,
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

/** The engine-suspension the member is serving, if any, with the merit that ends it. */
async function loadAutoSuspension(accountId) {
  const { autoSuspendColumnsReady } = require('../lib/SchemaFeatures');
  if (!(await autoSuspendColumnsReady())) return null;
  const { rows } = await pool.query(
    `
    SELECT suspension_ends_at, auto_suspend_lift_merit
    FROM accounts
    WHERE account_id = $1
      AND LOWER(COALESCE(status, '')) = 'suspended'
      AND suspension_source = 'auto'
    `,
    [accountId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    endsAt: row.suspension_ends_at || null,
    liftAtMerit: row.auto_suspend_lift_merit == null ? null : Number(row.auto_suspend_lift_merit),
  };
}

/**
 * Where a lift would take the member: one option per band they can be brought out of, plus
 * the automatic suspension when it has a recovery level. Each option says how many points to
 * lift and the merit it lands on.
 */
async function getWarningLiftPreview(accountId) {
  await assertLiftAvailable();
  const { assertWarnableAccount } = require('./WarningBandServices');
  await assertWarnableAccount(accountId);
  await refreshLiveThresholds();

  const points = await sumActiveWarningPoints(accountId);
  const band = bandForPoints(points);
  const autoSuspension = await loadAutoSuspension(accountId);

  const bandRows = getLiveThresholds()
    .filter((row) => PRODUCT_BAND_IDS.includes(row.effect) && row.effect !== 'none' && row.minPoints > 0)
    .sort((a, b) => b.minPoints - a.minPoints);

  const options = [];
  for (const row of bandRows) {
    if (points < row.minPoints) continue;
    const targetPoints = row.minPoints - 1;
    const lift = points - targetPoints;
    options.push({
      id: `band:${row.effect}:${row.minPoints}`,
      kind: 'band',
      endsBand: row.effect,
      label: `End ${row.label}`,
      liftPoints: lift,
      targetMerit: meritFromWarningPoints(targetPoints),
      resultingBand: bandForPoints(targetPoints).label,
    });
  }

  if (autoSuspension?.liftAtMerit != null) {
    const targetPoints = Math.max(0, DEFAULT_MERIT - autoSuspension.liftAtMerit);
    const lift = Math.max(0, points - targetPoints);
    if (lift > 0) {
      options.unshift({
        id: 'auto_suspension',
        kind: 'auto_suspension',
        endsBand: null,
        label: 'End automatic suspension',
        liftPoints: lift,
        targetMerit: autoSuspension.liftAtMerit,
        resultingBand: bandForPoints(targetPoints).label,
      });
    }
  }

  // Different bands can need the same lift; keep the first (most serious) label.
  const seen = new Set();
  const unique = options.filter((option) => {
    if (seen.has(option.liftPoints)) return false;
    seen.add(option.liftPoints);
    return true;
  });

  return {
    accountId,
    points,
    merit: meritFromWarningPoints(points),
    band: band.id,
    bandLabel: band.id === 'none' ? null : band.label,
    autoSuspension,
    options: unique,
    // Floors of every product band, so the desk can show where any lift amount lands.
    bands: [...bandRows]
      .sort((a, b) => a.minPoints - b.minPoints)
      .map((row) => ({ id: row.effect, label: row.label, minPoints: row.minPoints })),
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

async function notifyLift(accountId, { lifted, merit, previousBand, nextBand }) {
  const ended = previousBand.id !== nextBand.id
    ? nextBand.id === 'none' || nextBand.id === 'record'
      ? ` ${previousBand.label} has ended and every action is open again.`
      : ` ${previousBand.label} has ended; ${nextBand.label} limits still apply until more warnings expire.`
    : '';
  try {
    const { createNotificationServices } = require('./NotificationServices');
    const notification = await createNotificationServices({
      account_id: accountId,
      message: `Staff lifted ${lifted} warning point${lifted === 1 ? '' : 's'} from your account. Your Platform Merit is now ${merit}.${ended}`,
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
        band: nextBand.id,
        label: nextBand.label,
        points: DEFAULT_MERIT - merit,
        previousBand: previousBand.id,
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
    const previousBand = bandForPoints(before);
    const nextBand = bandForPoints(after);
    summary = {
      accountId,
      lifted: amount,
      pointsBefore: before,
      pointsAfter: after,
      meritBefore: meritFromWarningPoints(before),
      meritAfter: meritFromWarningPoints(after),
      bandBefore: previousBand.id,
      bandAfter: nextBand.id,
      bandAfterLabel: nextBand.id === 'none' ? null : nextBand.label,
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
    summary.previousBand = previousBand;
    summary.nextBand = nextBand;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  await notifyLift(accountId, {
    lifted: summary.lifted,
    merit: summary.meritAfter,
    previousBand: summary.previousBand,
    nextBand: summary.nextBand,
  });

  // Band refresh also ends an automatic suspension whose recovery merit is now reached.
  let autoSuspensionLifted = false;
  try {
    const before = await loadAutoSuspension(accountId);
    const { refreshWarningBand } = require('./WarningBandServices');
    await refreshWarningBand(accountId);
    autoSuspensionLifted = Boolean(before) && !(await loadAutoSuspension(accountId));
  } catch (err) {
    console.warn('Warning band refresh after lift failed:', err.message);
  }

  const { previousBand, nextBand, ...result } = summary;
  return { ...result, autoSuspensionLifted };
}

module.exports = {
  getWarningLiftPreview,
  liftWarningPoints,
};
