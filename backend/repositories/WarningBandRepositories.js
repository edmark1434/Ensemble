const { pool } = require('../lib/Database');

async function getWarningBandAccount(accountId) {
  const { rows } = await pool.query(
    `
    SELECT account_id, type, status, deleted_at
    FROM accounts
    WHERE account_id = $1
    `,
    [accountId]
  );
  return rows[0] || null;
}

async function sumActiveWarningPoints(accountId) {
  const { rows } = await pool.query(
    `
    SELECT COALESCE(SUM(LEAST(GREATEST(COALESCE(points, 1), 1), 10)), 0)::int AS points
    FROM violations
    WHERE account_id = $1
      AND deleted_at IS NULL
      AND LOWER(COALESCE(status, 'active')) IN ('active', 'open', 'pending')
      AND (expires_at IS NULL OR expires_at > NOW())
    `,
    [accountId]
  );
  return Number(rows[0]?.points || 0);
}

/**
 * SQL expression for an account's Platform Merit inside a larger query: 100 minus active,
 * unexpired warning points, using the same rule as sumActiveWarningPoints.
 * @param {string} accountIdColumn trusted column reference, e.g. 'g.freelancer_account_id'
 */
function platformMeritSql(accountIdColumn) {
  return `GREATEST(0, 100 - COALESCE((
      SELECT SUM(LEAST(GREATEST(COALESCE(v_m.points, 1), 1), 10))::int
      FROM violations v_m
      WHERE v_m.account_id = ${accountIdColumn}
        AND v_m.deleted_at IS NULL
        AND LOWER(COALESCE(v_m.status, 'active')) IN ('active', 'open', 'pending')
        AND (v_m.expires_at IS NULL OR v_m.expires_at > NOW())
    ), 0))`;
}

async function countProposalsToday(accountId) {
  const { rows } = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM proposals
    WHERE (proposed_by_account_id = $1 OR freelancer_account_id = $1)
      AND created_at >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
      AND deleted_at IS NULL
    `,
    [accountId]
  );
  return Number(rows[0]?.count || 0);
}

module.exports = {
  getWarningBandAccount,
  sumActiveWarningPoints,
  platformMeritSql,
  countProposalsToday,
};
