/**
 * Timed merit punishments.
 *
 * When a warning takes a member's Platform Merit down to or past a threshold row, that row's
 * punishment starts and runs for the row's number of days. It is not ended by the warning
 * expiring, by staff lifting points, or by merit recovering: those only change merit. A deeper
 * drop crosses harsher rows, so punishments escalate. Merit itself is never changed here.
 *
 * Punishments of the same kind overlap: the one that ends last decides when that kind ends.
 * Different kinds run side by side (a Restricted band and a mute can both be running). The
 * strictest running band is the one the product checks use.
 *
 * What ends one early: staff "End early" (Admin / Support), a pardon, an accepted appeal
 * (within 24 hours), or rescinding / reversing the warning that started it.
 */
const { pool } = require('../lib/Database');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const {
  listActiveMeritPenalties,
  listMeritPenaltyHistory,
  getMeritPenalty,
  insertMeritPenalty,
  endMeritPenalties,
  shortenMeritPenaltiesForAppeal: shortenForAppeal,
  hasRunningMeritPenalty,
  closeElapsedMeritPenalties,
  pointsAroundWarning,
} = require('../repositories/MeritPenaltyRepositories');
const {
  AUTO_SUSPEND_POINTS,
  NO_BAND,
  bandFromPenalties,
  effectLabel,
  meritFromWarningPoints,
  refreshLiveThresholds,
  rulesCrossed,
} = require('../lib/WarningBands');

const END_REASON_MIN = 5;

const END_REASON_TEXT = {
  expired: 'its time ran out',
  staff: 'ended early by staff',
  pardoned: 'account pardoned',
  appeal: 'appeal accepted',
  rescinded: 'the warning behind it was rescinded',
  reversed: 'the warning behind it was reversed',
};

const EFFECT_ORDER = { auto_suspend: 5, frozen: 4, restricted: 3, mute: 2, limited: 1 };

function penaltyError(message, statusCode = 400, code = 'MERIT_PENALTY_INVALID') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function formatWhen(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function daysText(days) {
  const n = Number(days) || 0;
  return `${n} day${n === 1 ? '' : 's'}`;
}

async function tableReady() {
  const { meritPenaltiesReady } = require('../lib/SchemaFeatures');
  return meritPenaltiesReady();
}

/** What a member sees for one running kind of punishment. */
function publicPenalty(row) {
  return {
    id: row.id,
    effect: row.effect,
    label: effectLabel(row.effect),
    ruleLabel: row.label,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    durationDays: row.durationDays,
    triggerMerit: row.triggerMerit,
    meritAtStart: row.meritAtStart,
    endReason: row.endReason || null,
  };
}

const EMPTY_PUNISHMENTS = Object.freeze({
  ready: true,
  rows: [],
  list: [],
  band: { ...NO_BAND },
  mute: null,
  autoSuspend: null,
});

/**
 * Collapse running rows to one per kind (the one that ends last) and pick the strictest band.
 * @param {object[]} rows mapped `merit_penalties` rows that are running
 */
function summarizePenalties(rows) {
  const byEffect = new Map();
  for (const row of rows || []) {
    const current = byEffect.get(row.effect);
    if (!current || new Date(row.endsAt) > new Date(current.endsAt)) byEffect.set(row.effect, row);
  }
  const kinds = [...byEffect.values()].sort(
    (a, b) => (EFFECT_ORDER[b.effect] || 0) - (EFFECT_ORDER[a.effect] || 0)
  );
  return {
    ready: true,
    rows: rows || [],
    list: kinds.map(publicPenalty),
    band: bandFromPenalties(kinds),
    mute: byEffect.has('mute') ? publicPenalty(byEffect.get('mute')) : null,
    autoSuspend: byEffect.has('auto_suspend') ? publicPenalty(byEffect.get('auto_suspend')) : null,
  };
}

/**
 * Running punishments for an account. `ready: false` before the migration: callers then fall
 * back to bands that follow points live.
 */
async function getActiveMeritPunishments(accountId) {
  if (!accountId) return { ...EMPTY_PUNISHMENTS };
  if (!(await tableReady())) return { ...EMPTY_PUNISHMENTS, ready: false };
  const rows = await listActiveMeritPenalties(accountId);
  return summarizePenalties(rows);
}

/** Staff view: what is running now and what ran before. */
async function listAccountMeritPenalties(accountId) {
  if (!(await tableReady())) return { ready: false, active: [], history: [] };
  const [active, history] = await Promise.all([
    listActiveMeritPenalties(accountId),
    listMeritPenaltyHistory(accountId, { limit: 30 }),
  ]);
  // `label` is the plain name (Mute, Restricted, …); `ruleLabel` is the admin's row name.
  const staffRow = (row) => ({ ...row, label: effectLabel(row.effect), ruleLabel: row.label });
  return { ready: true, active: active.map(staffRow), history: history.map(staffRow) };
}

/** Tell the member's open tabs and sockets to re-read their standing. */
async function broadcastPunishmentChange(accountId) {
  try {
    const { getAccountAccess } = require('../lib/AccountRestriction');
    const access = await getAccountAccess(accountId);
    const { getIo, refreshSocketStanding } = require('../lib/WebSocket');
    refreshSocketStanding(accountId, access);
    const io = getIo();
    // `band` with no code/status/restriction: the client refetches instead of treating it as a lock.
    if (io) {
      io.to(String(accountId)).emit('account:restricted', {
        band: access.warningBand,
        label: access.warningBandLabel,
        points: access.warningPoints,
        punishments: (access.meritPenalties || []).map((p) => p.effect),
      });
    }
  } catch (err) {
    console.warn('Merit punishment broadcast skipped:', err.message);
  }
}

async function notifyMember(accountId, message, { prefix = 'WARNING_DOWN', referenceTable = 'accounts', referenceId = null } = {}) {
  try {
    const { createNotificationServices } = require('./NotificationServices');
    const notification = await createNotificationServices({
      account_id: accountId,
      message,
      is_read: false,
      reference_table: referenceTable,
      reference_prefix: prefix,
      reference_path: '/profile',
      reference_id: referenceId || accountId,
    });
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io && notification) io.to(String(accountId)).emit('notification', notification);
  } catch (err) {
    console.warn('Merit punishment notice failed:', err.message);
  }
}

/**
 * Suspend for the rule's days. A member already suspended is never shortened: the suspension
 * is extended when this one would end later, and left alone otherwise. Bans and locks are
 * stricter, so they are never overwritten.
 */
async function applyAutoSuspension(accountId, rule, { points, staffId, violationId, ready }) {
  const days = Number(rule.durationDays) || 7;
  const { autoSuspendColumnsReady } = require('../lib/SchemaFeatures');
  const markAuto = await autoSuspendColumnsReady();
  const merit = meritFromWarningPoints(points);
  const applied = await pool.query(
    `
    WITH prev AS (
      SELECT account_id, status, suspension_ends_at
             ${markAuto ? ', suspension_source' : ''}
      FROM accounts
      WHERE account_id = $1 AND deleted_at IS NULL
      FOR UPDATE
    )
    UPDATE accounts a
    SET status = 'Suspended',
        suspension_ends_at = CASE
          WHEN LOWER(COALESCE(prev.status, '')) = 'suspended'
            THEN GREATEST(prev.suspension_ends_at, NOW() + make_interval(days => $2::int))
          ELSE NOW() + make_interval(days => $2::int)
        END
        ${markAuto
          ? `, suspension_source = CASE WHEN LOWER(COALESCE(prev.status, '')) = 'suspended'
               THEN prev.suspension_source ELSE 'auto' END`
          : ''}
    FROM prev
    WHERE a.account_id = prev.account_id
      AND LOWER(COALESCE(prev.status, 'active')) NOT IN ('banned', 'locked')
      AND NOT (
        LOWER(COALESCE(prev.status, '')) = 'suspended'
        AND (prev.suspension_ends_at IS NULL OR prev.suspension_ends_at >= NOW() + make_interval(days => $2::int))
      )
    RETURNING prev.status AS previous_status, a.suspension_ends_at AS ends_at
    `,
    [accountId, days]
  );
  if (!applied.rowCount) return { suspended: false, days, merit };

  const previousStatus = applied.rows[0].previous_status;
  const endsAt = applied.rows[0].ends_at;
  const extended = String(previousStatus || '').toLowerCase() === 'suspended';

  if (ready) {
    await insertMeritPenalty(pool, {
      accountId,
      thresholdId: rule.id || null,
      violationId,
      effect: 'auto_suspend',
      label: rule.label,
      minPoints: rule.minPoints,
      pointsAtStart: points,
      durationDays: days,
    }).catch((err) => console.warn('Auto-suspend record skipped:', err.message));
  }

  await recordAccountActivity({
    accountId,
    action: extended
      ? `Suspension extended to ${daysText(days)} from now — Platform Merit dropped to ${merit}`
      : `Auto-suspended ${daysText(days)} — Platform Merit dropped to ${merit}`,
    eventCode: 'ACCOUNT_STATUS_CHANGED',
    referenceTable: 'accounts',
    referencePrefix: 'ACC',
    referenceId: accountId,
    actorStaffId: staffId,
    metadata: {
      previousStatus,
      status: 'Suspended',
      action: extended ? 'auto_suspend_extended' : 'auto_suspend',
      activeWarnings: points,
      merit,
      triggerMerit: Math.max(0, 100 - rule.minPoints),
      suspensionDays: days,
      suspensionEndsAt: endsAt,
      violationId: violationId || null,
      source: 'warning_thresholds',
    },
  });

  // The one suspension notice for this crossing. notifyAccountWarned does not send another.
  try {
    const { notifyAccountStatusChanged } = require('./AccountStandingServices');
    await notifyAccountStatusChanged(accountId, {
      status: 'Suspended',
      previousStatus,
      action: extended ? 'auto_suspend_extended' : 'auto_suspend',
      reason: extended
        ? `Your Platform Merit dropped to ${merit}, so your suspension now runs until ${formatWhen(endsAt)}. It runs its full time, even if your merit recovers.`
        : `Your Platform Merit dropped to ${merit}, so your account is suspended for ${daysText(days)}. It runs its full time, even if your merit recovers.`,
    });
  } catch (notifyErr) {
    console.error('Failed to notify auto-suspended account:', notifyErr);
  }

  return { suspended: true, extended, days, merit, endsAt, previousStatus };
}

async function announceStarted(accountId, rows, points, staffId) {
  const merit = meritFromWarningPoints(points);
  for (const row of rows) {
    await recordAccountActivity({
      accountId,
      action: `Automatic punishment: ${effectLabel(row.effect)} for ${daysText(row.durationDays)} (merit ${merit})`,
      eventCode: 'MERIT_PENALTY_STARTED',
      referenceTable: 'merit_penalties',
      referencePrefix: 'MPN',
      referenceId: row.id,
      actorStaffId: staffId,
      metadata: {
        effect: row.effect,
        label: row.label,
        durationDays: row.durationDays,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        merit,
        triggerMerit: row.triggerMerit,
        violationId: row.violationId,
      },
    });
  }
  const parts = rows.map(
    (row) => `${effectLabel(row.effect)} for ${daysText(row.durationDays)} (until ${formatWhen(row.endsAt)})`
  );
  await notifyMember(
    accountId,
    `Your Platform Merit dropped to ${merit}. Automatic punishment: ${parts.join('; ')}. ${
      rows.length === 1 ? 'It runs' : 'They run'
    } the full time, even if your merit recovers. See How to fix on the status bar for what is paused.`,
    { prefix: 'WARNING_DOWN' }
  );
}

/**
 * After a warning is issued: start every punishment row it crossed. Returns what happened, in
 * the shape the warn paths already pass to `notifyAccountWarned`.
 * @param {string} accountId
 * @param {{ violationId: string, staffId?: string|null }} options
 */
async function applyMeritPunishmentsForWarning(accountId, { violationId, staffId = null } = {}) {
  const empty = { suspended: false, activeCount: null, max: AUTO_SUSPEND_POINTS, started: [] };
  if (!accountId || !violationId) return empty;
  await refreshLiveThresholds();
  const around = await pointsAroundWarning(accountId, violationId);
  if (!around) return empty;
  const before = around.before;
  const after = around.before + around.weight;
  const rules = rulesCrossed(before, after);
  const result = {
    ...empty,
    activeCount: after,
    pointsBefore: before,
    pointsAfter: after,
    merit: meritFromWarningPoints(after),
  };
  if (!rules.length) return result;

  const ready = await tableReady();
  const started = [];
  for (const rule of rules) {
    if (rule.effect === 'auto_suspend') {
      const suspension = await applyAutoSuspension(accountId, rule, { points: after, staffId, violationId, ready });
      result.suspended = suspension.suspended;
      result.extended = Boolean(suspension.extended);
      result.days = suspension.days;
      continue;
    }
    // Before the migration, bands follow points live and a mute has nowhere to keep its clock.
    if (!ready) continue;
    try {
      const row = await insertMeritPenalty(pool, {
        accountId,
        thresholdId: rule.id || null,
        violationId,
        effect: rule.effect,
        label: rule.label,
        minPoints: rule.minPoints,
        pointsAtStart: after,
        durationDays: rule.durationDays,
      });
      if (row) started.push(row);
    } catch (err) {
      console.error(`Could not start the ${rule.effect} punishment:`, err.message);
    }
  }

  result.started = started.map(publicPenalty);
  if (started.length) {
    await announceStarted(accountId, started, after, staffId).catch((err) =>
      console.warn('Merit punishment announcement skipped:', err.message)
    );
  }
  if (started.length || result.suspended) await broadcastPunishmentChange(accountId);
  return result;
}

async function recordEnded(accountId, rows, { reason, staffId = null, note = null }) {
  for (const row of rows) {
    const why = row.endReason || reason;
    await recordAccountActivity({
      accountId,
      action: `Automatic punishment ended: ${effectLabel(row.effect)} — ${END_REASON_TEXT[why] || why}`,
      eventCode: 'MERIT_PENALTY_ENDED',
      referenceTable: 'merit_penalties',
      referencePrefix: 'MPN',
      referenceId: row.id,
      actorStaffId: staffId,
      metadata: {
        effect: row.effect,
        label: row.label,
        endsAt: row.endsAt,
        endReason: why,
        note: note || null,
        violationId: row.violationId,
      },
    });
  }
}

function endedList(rows) {
  const names = [...new Set(rows.map((row) => effectLabel(row.effect)))];
  if (names.length <= 1) return names[0] || 'automatic punishment';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * End an automatic suspension when the punishment behind it ended early (rescind / reverse),
 * but only if the engine put it there and no other automatic suspension is still running.
 */
async function liftEndedAutoSuspension(accountId, { staffId = null, reason }) {
  const { autoSuspendColumnsReady } = require('../lib/SchemaFeatures');
  if (!(await autoSuspendColumnsReady())) return false;
  if (await hasRunningMeritPenalty(accountId, { effects: ['auto_suspend'] })) return false;
  const { restingStatusSql } = require('../lib/AccountRestriction');
  const lifted = await pool.query(
    `
    UPDATE accounts
    SET status = ${restingStatusSql()},
        suspension_ends_at = NULL,
        suspension_source = NULL
    WHERE account_id = $1
      AND LOWER(COALESCE(status, '')) = 'suspended'
      AND suspension_source = 'auto'
    RETURNING status
    `,
    [accountId]
  );
  if (!lifted.rowCount) return false;
  const nextStatus = lifted.rows[0].status || 'Active';
  await recordAccountActivity({
    accountId,
    action: `Automatic suspension ended — ${END_REASON_TEXT[reason] || reason}`,
    eventCode: 'ACCOUNT_STATUS_CHANGED',
    referenceTable: 'accounts',
    referencePrefix: 'ACC',
    referenceId: accountId,
    actorStaffId: staffId,
    metadata: { previousStatus: 'Suspended', status: nextStatus, action: 'auto_suspend_ended', reason, source: 'merit_penalties' },
  });
  if (String(nextStatus).toLowerCase() !== 'deactivated') {
    try {
      const { notifyAccountStatusChanged } = require('./AccountStandingServices');
      await notifyAccountStatusChanged(accountId, {
        status: 'Active',
        previousStatus: 'Suspended',
        action: 'auto_suspend_ended',
        reason: 'The warning behind your automatic suspension was withdrawn, so the suspension has ended.',
      });
    } catch (err) {
      console.warn('Auto-suspension end notice skipped:', err.message);
    }
  }
  return true;
}

/** Shared checks for staff ending punishments early. */
async function assertCanEndEarly(accountId, staffId, reason) {
  if (!staffId) throw penaltyError('Staff session required', 401);
  const note = String(reason || '').trim();
  if (note.length < END_REASON_MIN) {
    throw penaltyError(`Write why it ends early (at least ${END_REASON_MIN} characters). The member does not see it.`);
  }
  if (!(await tableReady())) {
    throw penaltyError(
      'Timed punishments need the latest database migration. Run `pnpm migrate` on the backend, then try again.',
      503,
      'MERIT_PENALTIES_UNAVAILABLE'
    );
  }
  const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
  await assertCanSanctionTarget({ actorStaffId: staffId, targetAccountId: accountId, action: 'end_punishment' });
  return note;
}

async function announceEndedEarly(accountId, ended, staffId, note) {
  await recordEnded(accountId, ended, { reason: 'staff', staffId, note });
  const still = await getActiveMeritPunishments(accountId);
  const frozen = ended.some((row) => row.effect === 'frozen');
  await notifyMember(
    accountId,
    `Staff ended your automatic ${endedList(ended)} early${frozen ? ': your account is unfrozen' : ''}.${
      still.list.length
        ? ` Still running: ${still.list.map((p) => `${p.label} until ${formatWhen(p.endsAt)}`).join('; ')}.`
        : ' Nothing automatic is running now.'
    }`,
    { prefix: 'WARNING_UP' }
  );
  await broadcastPunishmentChange(accountId);
  return still.list;
}

/**
 * Staff end one running punishment early (Admin / Support). Automatic suspensions are ended
 * from Change standing (Unsuspend), which also closes their record.
 */
async function endMeritPenaltyEarly(accountId, penaltyId, staffId, { reason } = {}) {
  const note = await assertCanEndEarly(accountId, staffId, reason);
  const penalty = await getMeritPenalty(accountId, penaltyId);
  if (!penalty) throw penaltyError('Punishment not found.', 404, 'MERIT_PENALTY_NOT_FOUND');
  if (penalty.endedAt || new Date(penalty.endsAt).getTime() <= Date.now()) {
    throw penaltyError('This punishment has already ended.', 409, 'MERIT_PENALTY_ENDED');
  }
  if (penalty.effect === 'auto_suspend') {
    throw penaltyError(
      'End an automatic suspension from Change standing → Unsuspend. That closes this record too.',
      409,
      'MERIT_PENALTY_SUSPENSION'
    );
  }

  const ended = await endMeritPenalties(pool, { accountId, penaltyId, reason: 'staff', staffId, note });
  if (!ended.length) throw penaltyError('This punishment has already ended.', 409, 'MERIT_PENALTY_ENDED');
  const running = await announceEndedEarly(accountId, ended, staffId, note);
  return { accountId, ended: ended.map(publicPenalty), running };
}

/**
 * Unfreeze: staff end several running punishments at once (Admin / Support). With no
 * `penaltyIds` or `effects`, every running band and mute ends. Suspensions are never ended
 * here; Unsuspend does that.
 * @param {{ reason: string, penaltyIds?: string[]|null, effects?: string[]|null }} input
 */
async function endMeritPenaltiesEarly(accountId, staffId, { reason, penaltyIds = null, effects = null } = {}) {
  const note = await assertCanEndEarly(accountId, staffId, reason);
  const allowed = ['limited', 'restricted', 'frozen', 'mute'];
  const kinds = Array.isArray(effects) && effects.length
    ? effects.map((e) => String(e).toLowerCase()).filter((e) => allowed.includes(e))
    : allowed;
  if (!kinds.length) throw penaltyError('Pick which punishments to end.');
  const ids = Array.isArray(penaltyIds) && penaltyIds.length ? penaltyIds.map(String) : null;

  const ended = await endMeritPenalties(pool, {
    accountId,
    penaltyIds: ids,
    effects: kinds,
    reason: 'staff',
    staffId,
    note,
  });
  if (!ended.length) {
    throw penaltyError('Nothing automatic is running to end (suspensions end with Unsuspend).', 409, 'MERIT_PENALTY_NOTHING');
  }
  const running = await announceEndedEarly(accountId, ended, staffId, note);
  return { accountId, ended: ended.map(publicPenalty), running };
}

/**
 * Running punishments for many accounts, one entry per kind (the one ending last), strictest
 * first. Map of accountId → list. Empty before the migration.
 */
async function runningPunishmentsByAccount(accountIds) {
  const map = new Map();
  if (!(accountIds || []).length || !(await tableReady())) return map;
  const { listRunningMeritPenaltiesForAccounts } = require('../repositories/MeritPenaltyRepositories');
  const rows = await listRunningMeritPenaltiesForAccounts(accountIds);
  const byAccount = new Map();
  for (const row of rows) {
    const key = String(row.accountId);
    if (!byAccount.has(key)) byAccount.set(key, []);
    byAccount.get(key).push(row);
  }
  for (const [key, list] of byAccount) map.set(key, summarizePenalties(list).list);
  return map;
}

/** Same, for one account (staff detail views). */
async function runningPunishmentsFor(accountId) {
  if (!accountId) return [];
  const map = await runningPunishmentsByAccount([accountId]);
  return map.get(String(accountId)) || [];
}

/**
 * The warning that started these punishments was withdrawn (rescinded or reversed): they end
 * too, and so does an automatic suspension it caused. Punishments other warnings started stay.
 */
async function endMeritPenaltiesForWarning(accountId, violationId, { reason = 'rescinded', staffId = null } = {}) {
  if (!accountId || !violationId || !(await tableReady())) return [];
  const ended = await endMeritPenalties(pool, { accountId, violationId, reason, staffId });
  if (!ended.length) return [];
  await recordEnded(accountId, ended, { reason, staffId });
  if (ended.some((row) => row.effect === 'auto_suspend')) {
    await liftEndedAutoSuspension(accountId, { staffId, reason }).catch((err) =>
      console.warn('Automatic suspension end skipped:', err.message)
    );
  }
  const others = ended.filter((row) => row.effect !== 'auto_suspend');
  if (others.length) {
    await notifyMember(
      accountId,
      `The warning behind your automatic ${endedList(others)} was withdrawn, so ${others.length === 1 ? 'it has' : 'they have'} ended.`,
      { prefix: 'WARNING_UP' }
    );
  }
  await broadcastPunishmentChange(accountId);
  return ended.map(publicPenalty);
}

/** Pardon: every running punishment ends. Runs inside the pardon's transaction. */
async function endAllMeritPenalties(client, accountId, { staffId = null, note = null } = {}) {
  if (!(await tableReady())) return [];
  const ended = await endMeritPenalties(client, { accountId, reason: 'pardoned', staffId, note });
  for (const row of ended) {
    await recordAccountActivity({
      accountId,
      action: `Automatic punishment ended: ${effectLabel(row.effect)} — ${END_REASON_TEXT.pardoned}`,
      eventCode: 'MERIT_PENALTY_ENDED',
      referenceTable: 'merit_penalties',
      referencePrefix: 'MPN',
      referenceId: row.id,
      actorStaffId: staffId,
      metadata: { effect: row.effect, label: row.label, endReason: 'pardoned' },
      client,
    });
  }
  return ended.map(publicPenalty);
}

/**
 * A staff status change replaced the suspension (unsuspend, restore, ban, lock, new
 * suspension): the automatic-suspension record closes with it.
 */
async function closeAutoSuspensionRecords(accountId, { staffId = null } = {}) {
  if (!accountId || !(await tableReady())) return [];
  const ended = await endMeritPenalties(pool, {
    accountId,
    effects: ['auto_suspend'],
    reason: 'staff',
    staffId,
  });
  if (ended.length) await recordEnded(accountId, ended, { reason: 'staff', staffId });
  return ended;
}

/** Accepted appeal: running punishments end within 24 hours. Runs in the appeal's transaction. */
async function shortenMeritPenaltiesForAppeal(client, accountId) {
  if (!(await tableReady())) return 0;
  return shortenForAppeal(client, accountId);
}

/**
 * One-minute sweep: close punishments whose clock ran out and tell each member once. An
 * automatic suspension's end is announced by the standing lift, not here.
 */
async function sweepElapsedMeritPenalties({ limit = 200 } = {}) {
  if (!(await tableReady())) return 0;
  const closed = await closeElapsedMeritPenalties({ limit });
  const byAccount = new Map();
  for (const row of closed) {
    if (!byAccount.has(row.accountId)) byAccount.set(row.accountId, []);
    byAccount.get(row.accountId).push(row);
  }
  for (const [accountId, rows] of byAccount) {
    try {
      await recordEnded(accountId, rows, { reason: 'expired' });
      const visible = rows.filter((row) => row.effect !== 'auto_suspend');
      if (visible.length) {
        const still = await getActiveMeritPunishments(accountId);
        const appeal = visible.some((row) => row.endReason === 'appeal');
        await notifyMember(
          accountId,
          `Your automatic ${endedList(visible)} has ended${appeal ? ' after your appeal' : ''}.${
            still.list.length
              ? ` Still running: ${still.list.map((p) => `${p.label} until ${formatWhen(p.endsAt)}`).join('; ')}.`
              : ' Everything it paused is open again.'
          }`,
          { prefix: 'WARNING_UP' }
        );
      }
      await broadcastPunishmentChange(accountId);
    } catch (err) {
      console.warn('Merit punishment end notice skipped:', err.message);
    }
  }
  return closed.length;
}

module.exports = {
  EMPTY_PUNISHMENTS,
  summarizePenalties,
  getActiveMeritPunishments,
  listAccountMeritPenalties,
  applyMeritPunishmentsForWarning,
  endMeritPenaltyEarly,
  endMeritPenaltiesEarly,
  runningPunishmentsByAccount,
  runningPunishmentsFor,
  endMeritPenaltiesForWarning,
  endAllMeritPenalties,
  closeAutoSuspensionRecords,
  shortenMeritPenaltiesForAppeal,
  sweepElapsedMeritPenalties,
  broadcastPunishmentChange,
  publicPenalty,
};
