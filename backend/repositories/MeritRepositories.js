const { pool } = require('../lib/Database');

async function getMeritAccount(accountId) {
  const { rows } = await pool.query(
    `
    SELECT account_id, type, status, merit_score, created_at, deleted_at
    FROM accounts
    WHERE account_id = $1
    `,
    [accountId]
  );
  return rows[0] || null;
}

async function getMeritFacts(accountId) {
  const { rows } = await pool.query(
    `
    SELECT
      a.account_id,
      a.type,
      a.status,
      a.merit_score,
      a.created_at,
      (
        SELECT COUNT(DISTINCT c.contract_id)::int
        FROM contracts c
        LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
        LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
        LEFT JOIN jobs j ON j.job_id = p.job_id
        LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
        LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
        LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
        LEFT JOIN gigs g ON g.gig_id = gt.gig_id
        WHERE LOWER(c.status) = 'completed'
          AND (
            p.freelancer_account_id = a.account_id
            OR j.client_account_id = a.account_id
            OR g.freelancer_account_id = a.account_id
            OR gr.client_account_id = a.account_id
          )
      ) AS completions,
      (
        SELECT COUNT(*)::int FROM ratings r WHERE r.account_id = a.account_id
      ) AS review_count,
      (
        SELECT AVG(r.stars_out_of_five)::float FROM ratings r WHERE r.account_id = a.account_id
      ) AS review_average,
      (
        SELECT COALESCE(v.is_verified, FALSE)
          AND (avs.expires_at IS NULL OR avs.expires_at > NOW())
        FROM verifications v
        LEFT JOIN account_verification_sessions avs
          ON avs.verification_session_id = v.verification_session_id
        WHERE v.account_id = a.account_id
        LIMIT 1
      ) AS verified,
      (
        SELECT COALESCE(BOOL_OR(TRUE), FALSE)
        FROM restrictions r
        WHERE r.account_id = a.account_id
          AND (
            LOWER(r.type) IN ('forum_timeout', 'timeout')
            OR (LOWER(COALESCE(r.module, '')) = 'forum' AND LOWER(r.type) LIKE '%timeout%')
          )
          AND r.starts_at <= NOW()
          AND (r.ends_at IS NULL OR r.ends_at > NOW())
      ) AS timeout_active,
      (
        SELECT COALESCE(SUM(
          LEAST(GREATEST(COALESCE(vio.points, 1), 1), 3) * 8
        ), 0)::int
        FROM violations vio
        WHERE vio.account_id = a.account_id
          AND vio.deleted_at IS NULL
          AND LOWER(COALESCE(vio.status, 'active')) IN ('active', 'open', 'pending')
          AND (vio.expires_at IS NULL OR vio.expires_at > NOW())
      ) AS warning_hits,
      (
        SELECT CASE WHEN COUNT(*) > 0 THEN 15 ELSE 0 END
        FROM disputes d
        WHERE d.for_account_id = a.account_id
          AND LOWER(COALESCE(d.sanction_type, '')) = 'ban'
          AND d.resolved_at IS NOT NULL
          AND d.resolved_at > NOW() - INTERVAL '12 months'
      ) AS dispute_hits
    FROM accounts a
    WHERE a.account_id = $1
    `,
    [accountId]
  );
  return rows[0] || null;
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

async function updateMeritScore(accountId, score) {
  const { rows } = await pool.query(
    `
    UPDATE accounts
    SET merit_score = $2
    WHERE account_id = $1 AND deleted_at IS NULL
    RETURNING merit_score
    `,
    [accountId, score]
  );
  return rows[0]?.merit_score ?? score;
}

module.exports = {
  getMeritAccount,
  getMeritFacts,
  countProposalsToday,
  updateMeritScore,
};
