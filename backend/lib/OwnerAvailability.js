/**
 * Can an account answer the people who reach it right now?
 *
 * A job, gig, offer, order, DM or transfer needs the other side to respond. When that side is
 * deactivated, suspended, locked or banned (or is a team whose leader is banned, locked or
 * missing), the listing is paused: it leaves browse and refuses new proposals, orders and
 * offers. Nothing is written, so everything resumes on its own the moment the standing lifts.
 * Bans also close listings for good (BanCleanupServices); this gate covers the time between.
 *
 * A penalty whose end date has passed counts as over before the one-minute standing job
 * records the lift (same rule as TeamStandingServices).
 *
 * docs/punishment-system.md §9 "Paused while restricted".
 */

function col(alias, name) {
  return alias ? `${alias}.${name}` : name;
}

/** `alias.status` is a live penalty of one of `statuses` ('suspended' | 'locked' | 'banned'). */
function livePenaltySql(alias, statuses = ['suspended', 'locked', 'banned']) {
  const ends = { suspended: 'suspension_ends_at', locked: 'lock_ends_at', banned: 'ban_ends_at' };
  const parts = statuses.map(
    (status) => `(LOWER(COALESCE(${col(alias, 'status')}, '')) = '${status}'
      AND (${col(alias, ends[status])} IS NULL OR ${col(alias, ends[status])} > NOW()))`
  );
  return parts.length ? `(${parts.join(' OR ')})` : 'FALSE';
}

/**
 * A standard team whose first active Owner (the leader TeamStandingServices uses) is banned,
 * locked or missing. Contract workspaces are client-led and never count.
 */
function teamLeaderRestrictedSql(alias) {
  return `(
    LOWER(COALESCE(${col(alias, 'type')}, '')) = 'team'
    AND EXISTS (
      SELECT 1 FROM teams oa_t
      WHERE oa_t.account_id = ${col(alias, 'account_id')}
        AND oa_t.deleted_at IS NULL
        AND COALESCE(oa_t.team_type, 'standard') = 'standard'
        AND COALESCE((
          SELECT ${livePenaltySql('oa_leader', ['locked', 'banned'])}
          FROM team_members oa_tm
          JOIN users oa_u ON oa_u.user_id = oa_tm.user_id
          JOIN accounts oa_leader ON oa_leader.account_id = oa_u.account_id
          WHERE oa_tm.team_id = oa_t.team_id
            AND oa_tm.role = 'Owner'
            AND oa_tm.status = 'Active'
            AND oa_tm.deleted_at IS NULL
            AND oa_leader.deleted_at IS NULL
          ORDER BY oa_tm.joined_at ASC
          LIMIT 1
        ), TRUE)
    )
  )`;
}

/**
 * Why the account behind `alias` cannot answer right now, or NULL when it can.
 * @param {string} alias table alias of `accounts`
 * @param {{ deactivated?: boolean, suspended?: boolean, teamLeader?: boolean }} [options]
 *   `suspended: false` for listings that need no answer (marketplace purchases).
 * @returns {string} SQL text expression: 'deactivated' | 'banned' | 'locked' | 'suspended' | 'team_leader' | NULL
 */
function ownerUnavailableReasonSql(alias, { deactivated = true, suspended = true, teamLeader = true } = {}) {
  const branches = [];
  if (deactivated) {
    branches.push(`WHEN LOWER(COALESCE(${col(alias, 'type')}, '')) = 'user'
      AND (LOWER(COALESCE(${col(alias, 'status')}, '')) = 'deactivated' OR ${col(alias, 'deactivated_at')} IS NOT NULL)
      THEN 'deactivated'`);
  }
  branches.push(`WHEN ${livePenaltySql(alias, ['banned'])} THEN 'banned'`);
  branches.push(`WHEN ${livePenaltySql(alias, ['locked'])} THEN 'locked'`);
  if (suspended) branches.push(`WHEN ${livePenaltySql(alias, ['suspended'])} THEN 'suspended'`);
  if (teamLeader) branches.push(`WHEN ${teamLeaderRestrictedSql(alias)} THEN 'team_leader'`);
  return `(CASE ${branches.join('\n')} ELSE NULL END)`;
}

/** SQL boolean: the account behind `alias` cannot answer right now. */
function ownerUnavailableSql(alias, options) {
  return `(${ownerUnavailableReasonSql(alias, options)} IS NOT NULL)`;
}

/**
 * The public standing chip for the account behind `alias`, as JSON:
 * `{ status: 'Banned'|'Suspended'|'Locked'|null, endsAt, forumTimeout, forumTimeoutEndsAt }`.
 * Only what docs/punishment-system.md §11 makes public — never reasons, warnings or points.
 * Expired penalties read as none, before the minute job records the lift.
 */
function publicStandingSql(alias) {
  const timeoutMatch = `pst_r.account_id = ${col(alias, 'account_id')}
        AND (LOWER(pst_r.type) IN ('forum_timeout', 'timeout')
          OR (LOWER(COALESCE(pst_r.module, '')) = 'forum' AND LOWER(pst_r.type) LIKE '%timeout%'))
        AND pst_r.starts_at <= NOW()
        AND (pst_r.ends_at IS NULL OR pst_r.ends_at > NOW())`;
  return `json_build_object(
    'status', CASE
      WHEN ${livePenaltySql(alias, ['banned'])} THEN 'Banned'
      WHEN ${livePenaltySql(alias, ['locked'])} THEN 'Locked'
      WHEN ${livePenaltySql(alias, ['suspended'])} THEN 'Suspended'
      ELSE NULL END,
    'endsAt', CASE
      WHEN ${livePenaltySql(alias, ['banned'])} THEN ${col(alias, 'ban_ends_at')}
      WHEN ${livePenaltySql(alias, ['locked'])} THEN ${col(alias, 'lock_ends_at')}
      WHEN ${livePenaltySql(alias, ['suspended'])} THEN ${col(alias, 'suspension_ends_at')}
      ELSE NULL END,
    'forumTimeout', EXISTS (SELECT 1 FROM restrictions pst_r WHERE ${timeoutMatch}),
    'forumTimeoutEndsAt', (
      SELECT pst_r.ends_at FROM restrictions pst_r WHERE ${timeoutMatch}
      ORDER BY pst_r.created_at DESC LIMIT 1
    )
  )`;
}

const ROLE_NOUN = {
  client: 'This client',
  seller: 'This seller',
  creator: 'This creator',
  freelancer: 'This freelancer',
  member: 'This member',
};

/**
 * What a member trying to reach the account is told. Public standing chips already show the
 * status, so naming it here reveals nothing private. Never includes reasons or warnings.
 * @param {string|null} reason from ownerUnavailableReasonSql
 * @param {{ role?: keyof ROLE_NOUN, action?: string }} [options] action e.g. "taking proposals"
 */
function ownerUnavailableMessage(reason, { role = 'member', action = 'available' } = {}) {
  const who = ROLE_NOUN[role] || ROLE_NOUN.member;
  const doing = action === 'available' ? 'available' : action;
  switch (reason) {
    case 'deactivated':
      return `${who} has deactivated their account, so they are not ${doing} right now.`;
    case 'suspended':
      return `${who}'s account is suspended, so they are not ${doing} until the suspension ends.`;
    case 'team_leader':
      return `This team's leader can't use Ensemble right now, so the team is not ${doing} until Support assigns an owner.`;
    case 'locked':
    case 'banned':
      return `${who}'s account is restricted, so they are not ${doing}.`;
    default:
      return null;
  }
}

/** Error to throw when `reason` is set. Deactivation keeps its existing code for old clients. */
function ownerUnavailableError(reason, options) {
  const error = new Error(ownerUnavailableMessage(reason, options) || 'This member is not available right now.');
  error.statusCode = 409;
  error.code = reason === 'deactivated' ? 'ACCOUNT_DEACTIVATED' : 'OWNER_UNAVAILABLE';
  error.reason = reason;
  return error;
}

/**
 * Look up one account's availability (for service-level checks).
 * @param {string} accountId
 * @param {object} [options] same as ownerUnavailableReasonSql
 * @param {import('pg').PoolClient|import('pg').Pool} [client]
 * @returns {Promise<string|null>} reason, or null when the account can answer
 */
async function getOwnerUnavailableReason(accountId, options, client = null) {
  if (!accountId) return null;
  const db = client || require('./Database').pool;
  const result = await db.query(
    `SELECT ${ownerUnavailableReasonSql('a', options)} AS reason FROM accounts a WHERE a.account_id = $1::uuid`,
    [accountId]
  );
  return result.rows[0]?.reason || null;
}

/** Throw ownerUnavailableError when the account cannot answer. */
async function assertOwnerAvailable(accountId, messageOptions = {}, sqlOptions = undefined, client = null) {
  const reason = await getOwnerUnavailableReason(accountId, sqlOptions, client);
  if (reason) throw ownerUnavailableError(reason, messageOptions);
}

module.exports = {
  livePenaltySql,
  teamLeaderRestrictedSql,
  ownerUnavailableReasonSql,
  ownerUnavailableSql,
  publicStandingSql,
  ownerUnavailableMessage,
  ownerUnavailableError,
  getOwnerUnavailableReason,
  assertOwnerAvailable,
};
