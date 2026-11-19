/**
 * SQL for per-penalty appeals: which penalties are active on an account (each with a stable
 * id an appeal ticket can name), the appeals already filed on them, and what accepting one
 * changes. Rules live in `services/PenaltyAppealServices.js`.
 *
 * Penalty ids:
 *  - ban / lock / suspension: the `ACCOUNT_STATUS_CHANGED` activity row that moved the account
 *    into that status. Extensions (Suspended → Suspended) keep the same penalty.
 *  - forum_timeout: `restrictions.restriction_id`.
 *  - warning: `violations.violation_id`.
 *  - credit_hold: `<wallet_id>@<frozen_at>`. A second hold restamps `frozen_at`, and is a new
 *    staff decision, so it is a new penalty.
 *  - merit_penalty: `merit_penalties.merit_penalty_id` (an automatic punishment with its own
 *    clock: limited, restricted, frozen access, mute). The automatic suspension is appealed as
 *    the `suspension` it put on the account, so it is not listed twice.
 *
 * Every function takes an optional `db` (the pool, or a transaction client).
 */
const { pool } = require('../lib/Database');
const { hasColumn } = require('../lib/SchemaFeatures');

const APPEAL_TICKET_TYPE = 'Appeal an account penalty';

/** Appeal target type → `accounts.status` (lowercase) for the standing penalties. */
const STANDING_STATUS = Object.freeze({ ban: 'banned', lock: 'locked', suspension: 'suspended' });
const STATUS_TARGET = Object.freeze({ banned: 'ban', locked: 'lock', suspended: 'suspension' });
const STANDING_END_COLUMN = Object.freeze({
  ban: 'ban_ends_at',
  lock: 'lock_ends_at',
  suspension: 'suspension_ends_at',
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIVE_WARNING_SQL = `
  v.deleted_at IS NULL
  AND LOWER(COALESCE(v.status, 'active')) IN ('active', 'open', 'pending')
  AND (v.expires_at IS NULL OR v.expires_at > NOW())
`;

/** Same match as the forum-timeout gate in `lib/AccountRestriction.js`. */
const ACTIVE_TIMEOUT_SQL = `
  (
    LOWER(r.type) IN ('forum_timeout', 'timeout')
    OR (LOWER(COALESCE(r.module, '')) = 'forum' AND LOWER(r.type) LIKE '%timeout%')
  )
  AND r.starts_at <= NOW()
  AND (r.ends_at IS NULL OR r.ends_at > NOW())
`;

/** `tickets.appeal_target_*` (per-penalty-appeals migration). Before it, appeals are account-wide. */
function appealTargetsReady() {
  return hasColumn('tickets', 'appeal_target_type');
}

/** `merit_penalties` (timed-merit-punishments migration). */
function meritPenaltiesReady() {
  return hasColumn('merit_penalties', 'merit_penalty_id');
}

/** Same "running" test as the merit punishment engine (MeritPenaltyRepositories). */
const RUNNING_MERIT_PENALTY_SQL = `mp.ended_at IS NULL AND mp.ends_at > NOW()`;

function creditHoldKey(row) {
  const at = row?.frozen_at ? new Date(row.frozen_at) : null;
  return `${row.wallet_id}@${at && !Number.isNaN(at.getTime()) ? at.toISOString() : 'held'}`;
}

/**
 * The ban, lock or suspension the account is serving now, or null.
 * `changedAt` is the latest status change into this status (an extension or re-issue): an
 * appeal decided before it does not hold the penalty back.
 */
async function loadStandingPenalty(accountId, { db = pool, lock = false } = {}) {
  const account = await db.query(
    `SELECT status, suspension_ends_at, ban_ends_at, lock_ends_at
     FROM accounts
     WHERE account_id = $1 AND deleted_at IS NULL
     ${lock ? 'FOR UPDATE' : ''}`,
    [accountId]
  );
  const row = account.rows[0];
  if (!row) return null;
  const status = String(row.status || '').trim().toLowerCase();
  const type = STATUS_TARGET[status];
  if (!type) return null;

  // `created_at` is cast so activity rows (timestamp without time zone) compare as instants.
  const history = await db.query(
    `
    SELECT
      (SELECT jsonb_build_object(
                'id', aa.account_activity_id,
                'at', aa.created_at::timestamptz,
                'metadata', aa.metadata)
       FROM account_activity aa
       WHERE aa.account_id = $1
         AND aa.event_code = 'ACCOUNT_STATUS_CHANGED'
         AND LOWER(COALESCE(aa.metadata->>'status', '')) = $2
         AND LOWER(COALESCE(aa.metadata->>'previousStatus', '')) <> $2
       ORDER BY aa.created_at DESC
       LIMIT 1) AS started,
      (SELECT aa.created_at::timestamptz
       FROM account_activity aa
       WHERE aa.account_id = $1
         AND aa.event_code = 'ACCOUNT_STATUS_CHANGED'
         AND LOWER(COALESCE(aa.metadata->>'status', '')) = $2
       ORDER BY aa.created_at DESC
       LIMIT 1) AS changed_at
    `,
    [accountId, status]
  );
  const started = history.rows[0]?.started || null;
  const meta = started?.metadata && typeof started.metadata === 'object' ? started.metadata : {};
  const startedAt = started?.at || null;
  return {
    type,
    // Accounts set to this status before activity rows existed get one fixed id per status.
    id: started?.id ? String(started.id) : `${type}:current`,
    startedAt,
    changedAt: history.rows[0]?.changed_at || startedAt,
    endsAt: row[STANDING_END_COLUMN[type]] || null,
    reason: meta.reason ? String(meta.reason) : null,
    punishmentLabel: meta.punishmentLabel ? String(meta.punishmentLabel) : null,
    automatic: String(meta.action || '').startsWith('auto_suspend'),
    disputeNumber: meta.disputeNumber ? String(meta.disputeNumber) : null,
  };
}

async function listActiveForumTimeouts(accountId, { db = pool } = {}) {
  const result = await db.query(
    `
    SELECT r.restriction_id, r.starts_at, r.ends_at, r.created_at
    FROM restrictions r
    WHERE r.account_id = $1 AND ${ACTIVE_TIMEOUT_SQL}
    ORDER BY r.created_at DESC
    LIMIT 20
    `,
    [accountId]
  );
  return result.rows.map((row) => ({
    id: String(row.restriction_id),
    startedAt: row.starts_at || row.created_at || null,
    endsAt: row.ends_at || null,
  }));
}

async function listActiveWarnings(accountId, { db = pool } = {}) {
  const result = await db.query(
    `
    SELECT v.violation_id, v.violation_number, v.type, v.reason, v.created_at, v.expires_at,
           LEAST(GREATEST(COALESCE(v.points, 1), 1), 10) AS points
    FROM violations v
    WHERE v.account_id = $1 AND ${ACTIVE_WARNING_SQL}
    ORDER BY v.created_at DESC
    LIMIT 50
    `,
    [accountId]
  );
  return result.rows.map((row) => ({
    id: String(row.violation_id),
    number: row.violation_number || null,
    warningType: row.type || null,
    reason: row.reason || null,
    points: Number(row.points || 0),
    startedAt: row.created_at || null,
    endsAt: row.expires_at || null,
  }));
}

async function listActiveCreditHolds(accountId, { db = pool } = {}) {
  const result = await db.query(
    `
    SELECT w.wallet_id, w.frozen_balance_credits, w.frozen_at, w.frozen_until, w.frozen_reason
    FROM wallets w
    JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
    WHERE aw.account_id = $1
      AND w.type = 'account wallets'
      AND w.frozen_balance_credits > 0
    ORDER BY w.frozen_at DESC NULLS LAST
    `,
    [accountId]
  );
  return result.rows.map((row) => ({
    id: creditHoldKey(row),
    walletId: String(row.wallet_id),
    credits: Number(row.frozen_balance_credits || 0),
    reason: row.frozen_reason || null,
    startedAt: row.frozen_at || null,
    endsAt: row.frozen_until || null,
  }));
}

/**
 * Automatic merit punishments running now, except the automatic suspension (that one is the
 * account's `suspension` and is appealed as such).
 */
async function listActiveMeritPenalties(accountId, { db = pool } = {}) {
  if (!(await meritPenaltiesReady())) return [];
  const result = await db.query(
    `
    SELECT mp.merit_penalty_id, mp.effect, mp.label, mp.violation_id, mp.points_at_start,
           mp.starts_at, mp.ends_at
    FROM merit_penalties mp
    WHERE mp.account_id = $1
      AND mp.effect <> 'auto_suspend'
      AND ${RUNNING_MERIT_PENALTY_SQL}
    ORDER BY mp.starts_at DESC
    LIMIT 20
    `,
    [accountId]
  );
  return result.rows.map((row) => ({
    id: String(row.merit_penalty_id),
    effect: row.effect,
    label: row.label || null,
    violationId: row.violation_id ? String(row.violation_id) : null,
    startedAt: row.starts_at || null,
    endsAt: row.ends_at || null,
  }));
}

/** Targeted appeals this account filed (open and decided), newest first. */
async function listTargetedAppeals(accountId, { db = pool } = {}) {
  if (!(await appealTargetsReady())) return [];
  const result = await db.query(
    `
    SELECT ticket_id, ticket_number, status, appeal_target_type, appeal_target_id, appeal_target_label,
           appeal_target_started_at, appeal_decision, appeal_decided_at, created_at, updated_at
    FROM tickets
    WHERE account_id = $1
      AND deleted_at IS NULL
      AND type = $2
      AND appeal_target_type IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 200
    `,
    [accountId, APPEAL_TICKET_TYPE]
  );
  return result.rows;
}

/** An undecided appeal filed before appeals were per penalty (no target), or null. */
async function findLegacyOpenAppeal(accountId, { db = pool } = {}) {
  const targeted = await appealTargetsReady();
  const result = await db.query(
    `
    SELECT ticket_id, ticket_number, status, created_at
    FROM tickets
    WHERE account_id = $1
      AND deleted_at IS NULL
      AND type = $2
      AND appeal_decision IS NULL
      AND status NOT IN ('Closed', 'Resolved')
      ${targeted ? 'AND appeal_target_type IS NULL' : ''}
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [accountId, APPEAL_TICKET_TYPE]
  );
  return result.rows[0] || null;
}

/** The account-wide denial hold from before appeals were per penalty, or null. */
async function findLegacyAppealHold(accountId, { db = pool } = {}) {
  const result = await db.query(
    `SELECT decision, blocked_until, permanently_denied, decided_at, ticket_id
     FROM account_appeal_holds
     WHERE account_id = $1`,
    [accountId]
  );
  return result.rows[0] || null;
}

/** What a warning looks like now (any status), for an appeal whose warning is no longer active. */
async function findWarning(accountId, violationId, { db = pool } = {}) {
  if (!UUID_RE.test(String(violationId || ''))) return null;
  const result = await db.query(
    `SELECT violation_id, violation_number, type, status, expires_at, deleted_at
     FROM violations
     WHERE account_id = $1 AND violation_id = $2::uuid`,
    [accountId, violationId]
  );
  return result.rows[0] || null;
}

/* ------------------------------------------------------------------ */
/* Accepting one penalty (inside the decision's transaction)           */
/* ------------------------------------------------------------------ */

/**
 * How an accepted appeal lifts a timed penalty:
 *  - `24h`: ends within 24 hours (the default the policy promises),
 *  - `now`: ends right away,
 *  - `at`: ends at an earlier time staff chose (`at` is a Date in the future).
 * Never later than the penalty was already going to end.
 * @typedef {{ mode?: '24h'|'now'|'at', at?: Date|null }} LiftOptions
 */
const LIFT_STATE = { '24h': 'ends_soon', now: 'ended_now', at: 'shortened' };

function liftMode(options) {
  return ['now', 'at'].includes(options?.mode) ? options.mode : '24h';
}

/** SQL for the new end of `column`; `param` is the placeholder holding the chosen time. */
function newEndSql(column, mode, param) {
  if (mode === 'now') return 'NOW()';
  const cap = mode === 'at' ? `${param}::timestamptz` : `NOW() + INTERVAL '24 hours'`;
  return `LEAST(COALESCE(${column}, 'infinity'::timestamptz), ${cap})`;
}

function liftError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

/** "Shorten" must actually shorten: the chosen time has to come before the current end. */
function assertEarlier(currentEnd, mode, at) {
  if (mode !== 'at') return;
  if (!(at instanceof Date) || Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) {
    throw liftError('Pick a new end time in the future.');
  }
  const end = currentEnd ? new Date(currentEnd) : null;
  if (end && at.getTime() >= end.getTime()) {
    throw liftError(
      `Pick an end time before the current one (${end.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}).`
    );
  }
}

function liftResult(result, mode) {
  return result.rowCount
    ? { applied: true, state: LIFT_STATE[mode], mode, endsAt: result.rows[0].ends_at || null }
    : { applied: false, state: 'ended', mode };
}

/**
 * Ban, lock or suspension — only when the account is still serving this exact penalty.
 * @param {LiftOptions} [options]
 */
async function endStandingPenalty(client, accountId, targetType, targetId, options = {}) {
  const mode = liftMode(options);
  const current = await loadStandingPenalty(accountId, { db: client, lock: true });
  if (!current) return { applied: false, state: 'ended', mode };
  if (current.type !== targetType || current.id !== String(targetId)) {
    return { applied: false, state: 'changed', mode, current };
  }
  assertEarlier(current.endsAt, mode, options.at);
  const column = STANDING_END_COLUMN[targetType];
  const params = [accountId, STANDING_STATUS[targetType]];
  if (mode === 'at') params.push(options.at);
  const result = await client.query(
    `UPDATE accounts
     SET ${column} = ${newEndSql(column, mode, '$3')}
     WHERE account_id = $1 AND LOWER(status) = $2
     RETURNING ${column} AS ends_at`,
    params
  );
  return liftResult(result, mode);
}

/** @param {LiftOptions} [options] */
async function endForumTimeout(client, accountId, restrictionId, options = {}) {
  const mode = liftMode(options);
  if (!UUID_RE.test(String(restrictionId || ''))) return { applied: false, state: 'ended', mode };
  const locked = await client.query(
    `SELECT r.ends_at FROM restrictions r
     WHERE r.restriction_id = $1::uuid AND r.account_id = $2 AND ${ACTIVE_TIMEOUT_SQL}
     FOR UPDATE`,
    [restrictionId, accountId]
  );
  if (!locked.rows.length) return { applied: false, state: 'ended', mode };
  assertEarlier(locked.rows[0].ends_at, mode, options.at);
  const params = [restrictionId, accountId];
  if (mode === 'at') params.push(options.at);
  const result = await client.query(
    `UPDATE restrictions r
     SET ends_at = ${newEndSql('r.ends_at', mode, '$3')}
     WHERE r.restriction_id = $1::uuid AND r.account_id = $2
     RETURNING r.ends_at`,
    params
  );
  return liftResult(result, mode);
}

/** A warning is rescinded at once: it stops counting toward merit and bands. */
async function rescindWarningRow(client, accountId, violationId) {
  if (!UUID_RE.test(String(violationId || ''))) return { applied: false, state: 'ended' };
  const result = await client.query(
    `UPDATE violations v
     SET status = 'rescinded'
     WHERE v.account_id = $1 AND v.violation_id = $2::uuid AND ${ACTIVE_WARNING_SQL}
     RETURNING v.violation_id, v.violation_number, v.type,
               LEAST(GREATEST(COALESCE(v.points, 1), 1), 10) AS points`,
    [accountId, violationId]
  );
  return result.rowCount
    ? { applied: true, state: 'rescinded', warning: result.rows[0] }
    : { applied: false, state: 'ended' };
}

/**
 * The held credits come back on the chosen clock; the one-minute job (or, for `now`, the
 * decision itself right after commit) releases them.
 * @param {LiftOptions} [options]
 */
async function endCreditHold(client, accountId, targetId, options = {}) {
  const mode = liftMode(options);
  const walletId = String(targetId || '').split('@')[0];
  if (!UUID_RE.test(walletId)) return { applied: false, state: 'ended', mode };
  const locked = await client.query(
    `SELECT w.wallet_id, w.frozen_balance_credits, w.frozen_at, w.frozen_until
     FROM wallets w
     JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
     WHERE aw.account_id = $1 AND w.wallet_id = $2::uuid AND w.type = 'account wallets'
     FOR UPDATE OF w`,
    [accountId, walletId]
  );
  const row = locked.rows[0];
  if (!row || Number(row.frozen_balance_credits || 0) <= 0) return { applied: false, state: 'ended', mode };
  // Staff placed another hold since: that is a newer decision this appeal is not about.
  if (creditHoldKey(row) !== String(targetId)) return { applied: false, state: 'changed', mode };
  assertEarlier(row.frozen_until, mode, options.at);
  const params = [row.wallet_id];
  if (mode === 'at') params.push(options.at);
  const result = await client.query(
    `UPDATE wallets
     SET frozen_until = ${newEndSql('frozen_until', mode, '$2')}
     WHERE wallet_id = $1
     RETURNING frozen_until AS ends_at, frozen_balance_credits`,
    params
  );
  return {
    ...liftResult(result, mode),
    credits: Number(result.rows[0]?.frozen_balance_credits || 0),
  };
}

/**
 * An automatic merit punishment ends on the chosen clock, never later than planned. The
 * engine's one-minute sweep closes it at that time and tells the member.
 * @param {LiftOptions} [options]
 */
async function endMeritPenalty(client, accountId, meritPenaltyId, options = {}) {
  const mode = liftMode(options);
  if (!UUID_RE.test(String(meritPenaltyId || '')) || !(await meritPenaltiesReady())) {
    return { applied: false, state: 'ended', mode };
  }
  const locked = await client.query(
    `SELECT mp.ends_at FROM merit_penalties mp
     WHERE mp.merit_penalty_id = $1::uuid AND mp.account_id = $2 AND ${RUNNING_MERIT_PENALTY_SQL}
     FOR UPDATE`,
    [meritPenaltyId, accountId]
  );
  if (!locked.rows.length) return { applied: false, state: 'ended', mode };
  assertEarlier(locked.rows[0].ends_at, mode, options.at);
  const params = [meritPenaltyId, accountId];
  if (mode === 'at') params.push(options.at);
  const result = await client.query(
    `UPDATE merit_penalties mp
     SET ends_at = ${mode === 'now' ? 'NOW()' : newEndSql('mp.ends_at', mode, '$3')},
         end_reason = 'appeal'
     WHERE mp.merit_penalty_id = $1::uuid AND mp.account_id = $2
     RETURNING mp.ends_at`,
    params
  );
  return liftResult(result, mode);
}

module.exports = {
  APPEAL_TICKET_TYPE,
  STANDING_STATUS,
  appealTargetsReady,
  loadStandingPenalty,
  listActiveForumTimeouts,
  listActiveWarnings,
  listActiveCreditHolds,
  listActiveMeritPenalties,
  listTargetedAppeals,
  findLegacyOpenAppeal,
  findLegacyAppealHold,
  findWarning,
  endStandingPenalty,
  endForumTimeout,
  rescindWarningRow,
  endCreditHold,
  endMeritPenalty,
};
