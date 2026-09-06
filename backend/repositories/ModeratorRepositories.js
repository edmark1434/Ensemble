const { pool } = require('../lib/Database');
const {
  recordAccountActivity,
  listRecentAccountActivity,
} = require('./AccountActivityRepositories');

/** Strike weight → days until expiry (1pt = 30 days). */
function violationExpiryFromPoints(points, fromDate = new Date()) {
  const days = Math.max(1, Number(points) || 1) * 30;
  const d = new Date(fromDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function isViolationActive(row, now = Date.now()) {
  const status = String(row.status || 'active').toLowerCase();
  if (['cleared', 'pardoned', 'resolved', 'expired'].includes(status)) return false;
  if (row.deleted_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) return false;
  return true;
}

function mapViolationRow(row) {
  const active = isViolationActive(row);
  const pastExpiry = Boolean(row.expires_at && new Date(row.expires_at).getTime() <= Date.now());
  return {
    id: row.violation_id,
    number: row.violation_number,
    account: {
      accountId: row.account_id,
      name: row.display_name || 'Unknown',
      handle: row.handle || '—',
      status: row.account_status,
    },
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

async function getViolationsAndRestrictions() {
  const result = await pool.query(`
    SELECT
      v.*,
      a.display_name,
      a.handle,
      a.status AS account_status,
      COALESCE(sa.display_name, s.first_name || ' ' || s.last_name) AS issued_by_name
    FROM violations v
    LEFT JOIN accounts a ON a.account_id = v.account_id
    LEFT JOIN staff s ON s.staff_id = v.staff_id
    LEFT JOIN accounts sa ON sa.account_id = s.account_id
    ORDER BY v.created_at DESC
    LIMIT 50
  `);

  const restrictedResult = await pool.query(`
    SELECT account_id, display_name, handle, status
    FROM accounts
    WHERE LOWER(status) IN ('suspended', 'banned', 'locked')
    ORDER BY display_name
  `);

  const recentActivity = await listRecentAccountActivity({ limit: 40 });

  return {
    violations: result.rows.map(mapViolationRow),
    restrictedAccounts: restrictedResult.rows.map((r) => ({
      accountId: r.account_id,
      name: r.display_name,
      handle: r.handle,
      status: r.status,
    })),
    recentActivity,
  };
}

async function issueViolation(accountId, { type, reason, points, expiresAt }, staffSession) {
  const violationNumber = `VIO-${Date.now().toString().slice(-8)}`;
  const violationType = String(type || 'warning').trim() || 'warning';
  const warnPoints = Number(points) || 1;
  const expiry =
    expiresAt != null && expiresAt !== ''
      ? new Date(expiresAt)
      : violationExpiryFromPoints(warnPoints);
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
      reason || null,
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
      expiresAt: expiry,
    },
  });

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

async function updateAccountRestriction(accountId, status, staffSession = null) {
  const allowed = ['active', 'suspended', 'banned', 'locked'];
  const normalized = String(status || '').toLowerCase();
  if (!allowed.includes(normalized)) {
    throw new Error(`Invalid restriction status: ${status}`);
  }

  const previous = await pool.query(
    `SELECT status FROM accounts WHERE account_id = $1 AND deleted_at IS NULL`,
    [accountId]
  );
  if (!previous.rows.length) throw new Error('Account not found');

  const nextStatus = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  await pool.query(`UPDATE accounts SET status = $1 WHERE account_id = $2`, [nextStatus, accountId]);

  const staffId = staffSession?.staff_id || staffSession?.staffId || null;
  await recordAccountActivity({
    accountId,
    action: `Account restriction status set to ${nextStatus}`,
    eventCode: 'ACCOUNT_STATUS_CHANGED',
    referenceTable: 'accounts',
    referencePrefix: 'ACC',
    referenceId: accountId,
    actorStaffId: staffId,
    metadata: {
      previousStatus: previous.rows[0].status,
      status: nextStatus,
      source: 'moderator_restrictions',
    },
  });

  return getViolationsAndRestrictions();
}

module.exports = {
  violationExpiryFromPoints,
  isViolationActive,
  getViolationsAndRestrictions,
  issueViolation,
  issueRestriction,
  updateAccountRestriction,
};
