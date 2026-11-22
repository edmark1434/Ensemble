const { pool } = require('../lib/Database');
const { livePenaltySql } = require('../lib/OwnerAvailability');

/**
 * Member parties of ended (`Done`) contracts who have not reviewed the other party yet.
 *
 * A contract stays `Done` until both parties review it (then it becomes `Completed`), so only
 * `Done` contracts can have a missing review. A review is a `ratings` row whose `account_id` is
 * the party being reviewed. Team accounts are skipped (they have no Platform Merit), and so are
 * contracts with an open dispute.
 *
 * @param {{ endedBefore: string, endedAfter: string, stage: 'remind' | 'warn', remindedBefore?: string, limit?: number }} input
 *   `endedBefore` / `endedAfter` bound `contracts.ended_at` as SQL intervals ago (e.g. '6 days').
 *   `stage = 'remind'` returns parties not reminded yet; `'warn'` returns parties reminded before
 *   `remindedBefore` ago and not warned yet.
 */
async function listPendingReviewers({ endedBefore, endedAfter, stage, remindedBefore = '0 seconds', limit = 200 }) {
  // A member who was suspended, locked or banned for any part of the review window could not
  // leave the review (ratings are writes), so they are never warned for missing it. A status
  // change into or out of a penalty since the contract ended means part of the window was
  // blocked; a penalty still running means it is blocked now.
  const blockedByStandingSql = `(
      ${livePenaltySql('reviewer')}
      OR EXISTS (
        SELECT 1 FROM account_activity standing_aa
        WHERE standing_aa.account_id = r.reviewer_account_id
          AND standing_aa.event_code = 'ACCOUNT_STATUS_CHANGED'
          AND standing_aa.created_at >= r.ended_at
          AND (
            LOWER(COALESCE(standing_aa.metadata->>'status', '')) IN ('suspended', 'locked', 'banned')
            OR LOWER(COALESCE(standing_aa.metadata->>'previousStatus', '')) IN ('suspended', 'locked', 'banned')
          )
      )
    )`;
  const stageSql = stage === 'warn'
    ? `o.warned_at IS NULL AND o.reminded_at IS NOT NULL AND o.reminded_at <= NOW() - $4::interval
       AND NOT ${blockedByStandingSql}`
    : `o.reminded_at IS NULL`;

  const result = await pool.query(
    `
    WITH parties AS (
      SELECT
        c.contract_id,
        c.ended_at,
        COALESCE(j.title, g.title) AS listing_title,
        COALESCE(j.client_account_id, gr.client_account_id) AS client_account_id,
        COALESCE(p.freelancer_account_id, g.freelancer_account_id) AS freelancer_account_id
      FROM contracts c
      LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
      LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
      LEFT JOIN jobs j ON j.job_id = p.job_id
      LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
      LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
      LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
      LEFT JOIN gigs g ON g.gig_id = gt.gig_id
      WHERE LOWER(c.status) = 'done'
        AND c.ended_at IS NOT NULL
        AND c.ended_at <= NOW() - $1::interval
        AND c.ended_at > NOW() - $2::interval
        AND NOT EXISTS (
          SELECT 1 FROM disputes d
          WHERE d.contract_id = c.contract_id
            AND d.deleted_at IS NULL
            AND LOWER(COALESCE(d.status, '')) <> 'closed'
        )
    ),
    reviewers AS (
      SELECT contract_id, ended_at, listing_title,
             client_account_id AS reviewer_account_id,
             freelancer_account_id AS reviewee_account_id
      FROM parties
      UNION ALL
      SELECT contract_id, ended_at, listing_title,
             freelancer_account_id AS reviewer_account_id,
             client_account_id AS reviewee_account_id
      FROM parties
    )
    SELECT
      r.contract_id,
      r.ended_at,
      r.listing_title,
      r.reviewer_account_id,
      r.reviewee_account_id,
      reviewee.display_name AS reviewee_name
    FROM reviewers r
    JOIN accounts reviewer ON reviewer.account_id = r.reviewer_account_id
    LEFT JOIN accounts reviewee ON reviewee.account_id = r.reviewee_account_id
    LEFT JOIN contract_review_obligations o
      ON o.contract_id = r.contract_id
     AND o.reviewer_account_id = r.reviewer_account_id
    WHERE r.reviewer_account_id IS NOT NULL
      AND r.reviewee_account_id IS NOT NULL
      AND r.reviewer_account_id <> r.reviewee_account_id
      AND LOWER(reviewer.type) = 'user'
      AND reviewer.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM ratings rt
        WHERE rt.contract_id = r.contract_id
          AND rt.account_id = r.reviewee_account_id
          AND rt.deleted_at IS NULL
      )
      AND ${stageSql}
    ORDER BY r.ended_at ASC
    LIMIT $3
    `,
    stage === 'warn'
      ? [endedBefore, endedAfter, limit, remindedBefore]
      : [endedBefore, endedAfter, limit]
  );
  return result.rows;
}

/** Record the reminder. Returns false when another run already reminded this party. */
async function markReviewReminded(contractId, reviewerAccountId) {
  const result = await pool.query(
    `
    INSERT INTO contract_review_obligations (contract_id, reviewer_account_id, reminded_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (contract_id, reviewer_account_id) DO UPDATE
      SET reminded_at = NOW()
      WHERE contract_review_obligations.reminded_at IS NULL
    RETURNING contract_id
    `,
    [contractId, reviewerAccountId]
  );
  return result.rowCount > 0;
}

/**
 * Insert the system warning and claim the obligation in one transaction, so a party is never
 * warned twice for the same contract. Returns null when the obligation was already warned.
 */
async function insertMissedReviewViolation({ contractId, reviewerAccountId, type, reason, points, expiresAt }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const claim = await client.query(
      `
      UPDATE contract_review_obligations
      SET warned_at = NOW()
      WHERE contract_id = $1 AND reviewer_account_id = $2 AND warned_at IS NULL
      RETURNING contract_id
      `,
      [contractId, reviewerAccountId]
    );
    if (claim.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const violationNumber = `VIO-${Date.now().toString().slice(-8)}`;
    const inserted = await client.query(
      `
      INSERT INTO violations (
        violation_number, account_id, type, reason, points,
        status, staff_id, expires_at
      ) VALUES ($1, $2, $3, $4, $5, 'active', NULL, $6)
      RETURNING violation_id
      `,
      [violationNumber, reviewerAccountId, type, reason, points, expiresAt]
    );
    const violationId = inserted.rows[0].violation_id;

    await client.query(
      `
      UPDATE contract_review_obligations
      SET violation_id = $3
      WHERE contract_id = $1 AND reviewer_account_id = $2
      `,
      [contractId, reviewerAccountId, violationId]
    );

    await client.query('COMMIT');
    return { violationId, violationNumber };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listPendingReviewers,
  markReviewReminded,
  insertMissedReviewViolation,
};
