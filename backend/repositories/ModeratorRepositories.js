const { pool } = require('../lib/Database');

function mapViolationRow(row) {
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
    status: row.status,
    issuedBy: row.issued_by_name || 'System',
    createdAt: row.created_at,
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
    LEFT JOIN staff s ON s.staff_id = v.issued_by_staff_id
    LEFT JOIN accounts sa ON sa.account_id = s.account_id
    ORDER BY v.created_at DESC
    LIMIT 50
  `);

  const restrictedResult = await pool.query(`
    SELECT account_id, display_name, handle, status
    FROM accounts
    WHERE LOWER(status) IN ('suspended', 'banned')
    ORDER BY display_name
  `);

  return {
    violations: result.rows.map(mapViolationRow),
    restrictedAccounts: restrictedResult.rows.map((r) => ({
      accountId: r.account_id,
      name: r.display_name,
      handle: r.handle,
      status: r.status,
    })),
  };
}

async function issueViolation(accountId, { type, reason, points }, staffSession) {
  const violationNumber = `VIO-${Date.now().toString().slice(-8)}`;
  const violationType = String(type || 'warning').trim() || 'warning';
  await pool.query(
    `INSERT INTO violations (violation_number, account_id, type, reason, points, issued_by_staff_id, status, staff_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', $6)`,
    [violationNumber, accountId, violationType, reason || null, Number(points) || 0, staffSession?.staff_id || null]
  );
  return getViolationsAndRestrictions();
}

async function updateAccountRestriction(accountId, status) {
  const allowed = ['active', 'suspended', 'banned'];
  if (!allowed.includes(status)) {
    throw new Error(`Invalid restriction status: ${status}`);
  }
  await pool.query(`UPDATE accounts SET status = $1 WHERE account_id = $2`, [status, accountId]);
  return getViolationsAndRestrictions();
}

module.exports = {
  getViolationsAndRestrictions,
  issueViolation,
  updateAccountRestriction,
};
