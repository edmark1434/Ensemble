const { pool } = require('../lib/Database');
const {
  recordAccountActivity,
  listRecentAccountActivity,
} = require('./AccountActivityRepositories');

const { warningDurationDays } = require('../lib/Merit');

/** Strike weight → days until expiry (1pt = 3 days, 5pt = 14 days, 10pt = 90 days). */
function violationExpiryFromPoints(points, fromDate = new Date()) {
  const days = warningDurationDays(points);
  const d = new Date(fromDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function isViolationActive(row, now = Date.now()) {
  const status = String(row.status || 'active').toLowerCase();
  if (['cleared', 'pardoned', 'resolved', 'expired', 'rescinded', 'reversed'].includes(status)) return false;
  if (row.deleted_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) return false;
  return true;
}

const FORUM_TIMEOUT_MATCH = `
  (
    LOWER(r.type) IN ('forum_timeout', 'timeout')
    OR (LOWER(COALESCE(r.module, '')) = 'forum' AND LOWER(r.type) LIKE '%timeout%')
  )
  AND r.starts_at <= NOW()
  AND (r.ends_at IS NULL OR r.ends_at > NOW())
`;

function mapDeskAccount(row) {
  return {
    accountId: row.account_id,
    name: row.display_name || 'Unknown',
    handle: row.handle || '',
    email: row.email_address || null,
    legalName: row.legal_name || null,
    type: row.account_type || null,
    status: row.account_status || row.status || 'Active',
    forumTimeout: Boolean(row.forum_timeout),
    suspensionEndsAt: row.suspension_ends_at || null,
    banEndsAt: row.ban_ends_at || null,
    lockEndsAt: row.lock_ends_at || null,
    timeoutEndsAt: row.timeout_ends_at || null,
  };
}

function mapViolationRow(row) {
  const active = isViolationActive(row);
  const pastExpiry = Boolean(row.expires_at && new Date(row.expires_at).getTime() <= Date.now());
  return {
    id: row.violation_id,
    number: row.violation_number,
    account: mapDeskAccount(row),
    type: row.type || 'warning',
    reason: row.reason,
    points: row.points,
    status: !active && pastExpiry ? 'expired' : row.status,
    issuedBy: row.issued_by_name || 'System',
    createdAt: row.created_at,
    expiresAt: row.expires_at || null,
    active,
  };
}

const ACCOUNT_DESK_SELECT = `
  a.account_id,
  a.display_name,
  a.handle,
  a.status AS account_status,
  a.type AS account_type,
  a.suspension_ends_at,
  a.ban_ends_at,
  a.lock_ends_at,
  u.email_address,
  NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS legal_name,
  EXISTS (
    SELECT 1 FROM restrictions r
    WHERE r.account_id = a.account_id AND ${FORUM_TIMEOUT_MATCH}
  ) AS forum_timeout,
  (
    SELECT r.ends_at
    FROM restrictions r
    WHERE r.account_id = a.account_id AND ${FORUM_TIMEOUT_MATCH}
    ORDER BY r.created_at DESC
    LIMIT 1
  ) AS timeout_ends_at
`;

async function getViolationsAndRestrictions() {
  const result = await pool.query(`
    SELECT
      v.*,
      ${ACCOUNT_DESK_SELECT},
      COALESCE(sa.display_name, s.first_name || ' ' || s.last_name) AS issued_by_name
    FROM violations v
    LEFT JOIN accounts a ON a.account_id = v.account_id
    LEFT JOIN LATERAL (
      SELECT email_address, first_name, last_name
      FROM users
      WHERE account_id = a.account_id
      ORDER BY user_id
      LIMIT 1
    ) u ON TRUE
    LEFT JOIN staff s ON s.staff_id = v.staff_id
    LEFT JOIN accounts sa ON sa.account_id = s.account_id
    ORDER BY v.created_at DESC
    LIMIT 50
  `);

  const restrictedResult = await pool.query(`
    SELECT ${ACCOUNT_DESK_SELECT}
    FROM accounts a
    LEFT JOIN LATERAL (
      SELECT email_address, first_name, last_name
      FROM users
      WHERE account_id = a.account_id
      ORDER BY user_id
      LIMIT 1
    ) u ON TRUE
    WHERE a.deleted_at IS NULL
      AND (
        LOWER(a.status) IN ('suspended', 'banned', 'locked')
        OR EXISTS (
          SELECT 1 FROM restrictions r
          WHERE r.account_id = a.account_id AND ${FORUM_TIMEOUT_MATCH}
        )
      )
    ORDER BY a.display_name
  `);

  const recentActivity = await listRecentAccountActivity({ limit: 40 });

  return {
    violations: result.rows.map(mapViolationRow),
    restrictedAccounts: restrictedResult.rows.map(mapDeskAccount),
    recentActivity,
  };
}

async function searchRestrictionAccounts(query) {
  const term = String(query || '').trim();
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_\\]/g, '\\$&')}%`;
  const result = await pool.query(
    `
    SELECT
      ${ACCOUNT_DESK_SELECT}
    FROM accounts a
    LEFT JOIN LATERAL (
      SELECT email_address, first_name, middle_name, last_name
      FROM users
      WHERE account_id = a.account_id
      ORDER BY user_id
      LIMIT 1
    ) u ON TRUE
    WHERE a.deleted_at IS NULL
      AND (
        a.display_name ILIKE $1 ESCAPE '\\'
        OR a.handle ILIKE $1 ESCAPE '\\'
        OR a.account_id::text ILIKE $1 ESCAPE '\\'
        OR COALESCE(u.email_address, '') ILIKE $1 ESCAPE '\\'
        OR COALESCE(u.first_name, '') ILIKE $1 ESCAPE '\\'
        OR COALESCE(u.middle_name, '') ILIKE $1 ESCAPE '\\'
        OR COALESCE(u.last_name, '') ILIKE $1 ESCAPE '\\'
        OR TRIM(CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)) ILIKE $1 ESCAPE '\\'
        OR COALESCE(a.type, '') ILIKE $1 ESCAPE '\\'
      )
    ORDER BY a.display_name NULLS LAST
    LIMIT 8
    `,
    [like]
  );
  return result.rows.map(mapDeskAccount);
}

async function issueViolation(accountId, { warningId, type, reason, points, expiresAt, duration, days, endsAt }, staffSession) {
  const violationNumber = `VIO-${Date.now().toString().slice(-8)}`;
  const { resolveIssuedWarning } = require('../services/WarningDefServices');
  const issued = await resolveIssuedWarning({ warningId, type, points });
  const violationType = issued.type;
  const warnPoints = issued.points;
  const warnReason = String(reason || '').trim();
  if (!warnReason) {
    const error = new Error('A reason is required');
    error.statusCode = 400;
    throw error;
  }
  const { warningExpiry } = require('../lib/AccountRestriction');
  const expiry = warningExpiry({ days, expiresAt, endsAt, points: warnPoints });
  const staffId = staffSession?.staff_id || staffSession?.staffId || null;

  const inserted = await pool.query(
    `INSERT INTO violations (
       violation_number, account_id, type, reason, points,
       status, staff_id, expires_at
     ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
     RETURNING violation_id`,
    [
      violationNumber,
      accountId,
      violationType,
      warnReason,
      warnPoints,
      staffId,
      expiry,
    ]
  );

  await recordAccountActivity({
    accountId,
    action: `Violation issued: ${violationType}`,
    eventCode: 'VIOLATION_ISSUED',
    referenceTable: 'violations',
    referencePrefix: 'VIO',
    referenceId: inserted.rows[0]?.violation_id || violationNumber,
    actorStaffId: staffId,
    metadata: {
      violationNumber,
      type: violationType,
      reason: reason || null,
      points: warnPoints,
      warningId: issued.warningId,
      expiresAt: expiry,
    },
  });

  const { maybeAutoSuspendAfterWarning } = require('../lib/ModerationPolicy');
  const autoSuspend = await maybeAutoSuspendAfterWarning(accountId, staffId);

  try {
    const { notifyAccountWarned } = require('../services/AccountStandingServices');
    const { countActiveWarnings } = require('../lib/ModerationPolicy');
    const activeCount = await countActiveWarnings(accountId);
    await notifyAccountWarned(accountId, {
      violationId: inserted.rows[0]?.violation_id || null,
      violationNumber,
      type: violationType,
      reason: reason || null,
      points: warnPoints,
      expiresAt: expiry,
      activeWarnings: activeCount,
      autoSuspended: Boolean(autoSuspend?.suspended),
      maxWarningsBeforeSuspend: autoSuspend?.max ?? null,
    });
  } catch (notifyErr) {
    console.warn('Failed to broadcast moderator warning notification:', notifyErr.message);
  }

  try {
    require('../services/MeritServices').scheduleMeritRecompute(accountId);
  } catch (err) {
    console.warn('Merit recompute after moderator warning failed:', err.message);
  }

  return getViolationsAndRestrictions();
}

async function issueRestriction(
  accountId,
  { type, module, startsAt, endsAt, violationId } = {},
  staffSession
) {
  if (!accountId) throw new Error('accountId is required');
  const restrictionType = String(type || 'account_restriction').trim() || 'account_restriction';
  const staffId = staffSession?.staff_id || staffSession?.staffId || null;
  if (!staffId) throw new Error('Staff session required to issue a restriction');

  const inserted = await pool.query(
    `INSERT INTO restrictions (
       type, module, starts_at, ends_at, violation_id, account_id, staff_id
     ) VALUES ($1, $2, COALESCE($3::timestamptz, NOW()), $4, $5, $6, $7)
     RETURNING restriction_id`,
    [
      restrictionType,
      module || null,
      startsAt || null,
      endsAt || null,
      violationId || null,
      accountId,
      staffId,
    ]
  );

  await recordAccountActivity({
    accountId,
    action: `Restriction applied: ${restrictionType}`,
    eventCode: 'RESTRICTION_ISSUED',
    referenceTable: 'restrictions',
    referencePrefix: 'RST',
    referenceId: inserted.rows[0]?.restriction_id || null,
    actorStaffId: staffId,
    metadata: {
      type: restrictionType,
      module: module || null,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      violationId: violationId || null,
    },
  });

  return getViolationsAndRestrictions();
}

async function updateAccountRestriction(accountId, status, staffSession = null, options = {}) {
  const raw = String(status || '').trim().toLowerCase();
  const aliases = {
    suspended: 'suspend',
    banned: 'ban',
    locked: 'lock',
    active: 'restore',
  };
  const action = aliases[raw] || raw;
  const { assertStatusActionAllowed } = require('../lib/UserTeamPermissions');
  assertStatusActionAllowed(staffSession, action);

  const { updateAccountStatus } = require('./AdminUserTeamRepositories');
  const staffId = staffSession?.staff_id || staffSession?.staffId || null;
  await updateAccountStatus(accountId, action, staffId, options);
  return getViolationsAndRestrictions();
}

module.exports = {
  violationExpiryFromPoints,
  isViolationActive,
  getViolationsAndRestrictions,
  searchRestrictionAccounts,
  issueViolation,
  issueRestriction,
  updateAccountRestriction,
};
