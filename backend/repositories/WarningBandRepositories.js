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
      AND expires_at IS NOT NULL
      AND expires_at > NOW()
    `,
    [accountId]
  );
  return Number(rows[0]?.points || 0);
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
  countProposalsToday,
};
