const { pool } = require('../lib/Database');
const { ownerUnavailableReasonSql, publicStandingSql } = require('../lib/OwnerAvailability');

/**
 * Live work where one side can no longer act: contracts that are running, waiting to start or
 * waiting on a signature while a party is suspended, locked or banned (or is a team whose
 * leader is). Bans leave these untouched for staff (docs/punishment-system.md §9); this is the
 * list staff work from so the other party's credits are never forgotten.
 */

const LIVE_CONTRACT_STATUSES = ['active', 'waiting', 'pending signature'];

/** One row per live job or gig contract with its two sides. */
const CONTRACT_PARTIES_SQL = `
  SELECT c.contract_id,
         c.status AS contract_status,
         c.created_at AS contract_created_at,
         c.starts_at,
         CASE WHEN jc.contract_id IS NOT NULL THEN 'job' ELSE 'gig' END AS kind,
         COALESCE(j.title, g.title) AS title,
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
  WHERE LOWER(c.status) = ANY($1::text[])
    AND (jc.contract_id IS NOT NULL OR gc.contract_id IS NOT NULL)
`;

/** Live contracts where `accountId` is either side, with the other side named. */
async function listLiveContractsForAccount(accountId, { includePendingSignature = false } = {}) {
  const statuses = includePendingSignature ? LIVE_CONTRACT_STATUSES : ['active', 'waiting'];
  const result = await pool.query(
    `WITH parties AS (${CONTRACT_PARTIES_SQL})
     SELECT DISTINCT ON (contract_id) *,
            CASE WHEN client_account_id = $2::uuid THEN freelancer_account_id ELSE client_account_id END
              AS other_account_id,
            CASE WHEN client_account_id = $2::uuid THEN 'client' ELSE 'freelancer' END AS restricted_side
     FROM parties
     WHERE $2::uuid IN (client_account_id, freelancer_account_id)
     ORDER BY contract_id`,
    [statuses, accountId]
  );
  return result.rows;
}

/** Latest status change into the account's current penalty: when it became restricted. */
const RESTRICTED_SINCE_SQL = (alias) => `(
  SELECT MAX(rs_aa.created_at)
  FROM account_activity rs_aa
  WHERE rs_aa.account_id = ${alias}.account_id
    AND rs_aa.event_code = 'ACCOUNT_STATUS_CHANGED'
    AND LOWER(COALESCE(rs_aa.metadata->>'status', '')) = LOWER(COALESCE(${alias}.status, ''))
)`;

/**
 * Contracts with at least one restricted side, oldest restriction first.
 * @param {{ limit?: number, offset?: number, status?: 'all'|'banned'|'locked'|'suspended'|'team_leader', search?: string }} options
 */
async function listRestrictedPartyContracts({ limit = 50, offset = 0, status = 'all', search = '' } = {}) {
  const reasonFilter = ['banned', 'locked', 'suspended', 'team_leader'].includes(status) ? status : null;
  const term = String(search || '').trim();
  const result = await pool.query(
    `WITH parties AS (${CONTRACT_PARTIES_SQL}),
     rows AS (
       SELECT pt.*,
              ca.display_name AS client_name, ca.handle AS client_handle, ca.type AS client_type,
              fa.display_name AS freelancer_name, fa.handle AS freelancer_handle, fa.type AS freelancer_type,
              ${ownerUnavailableReasonSql('ca', { deactivated: false })} AS client_reason,
              ${ownerUnavailableReasonSql('fa', { deactivated: false })} AS freelancer_reason,
              ${publicStandingSql('ca')} AS client_standing,
              ${publicStandingSql('fa')} AS freelancer_standing,
              ${RESTRICTED_SINCE_SQL('ca')} AS client_restricted_since,
              ${RESTRICTED_SINCE_SQL('fa')} AS freelancer_restricted_since,
              open_dispute.dispute_id AS open_dispute_id,
              open_dispute.dispute_number AS open_dispute_number
       FROM parties pt
       JOIN accounts ca ON ca.account_id = pt.client_account_id
       JOIN accounts fa ON fa.account_id = pt.freelancer_account_id
       LEFT JOIN LATERAL (
         SELECT d.dispute_id, d.dispute_number
         FROM disputes d
         WHERE d.contract_id = pt.contract_id
           AND d.deleted_at IS NULL
           AND d.status <> 'closed'
         ORDER BY d.created_at DESC
         LIMIT 1
       ) open_dispute ON TRUE
     )
     SELECT *, COUNT(*) OVER()::int AS total_count
     FROM rows
     WHERE (client_reason IS NOT NULL OR freelancer_reason IS NOT NULL)
       AND ($2::text IS NULL OR client_reason = $2 OR freelancer_reason = $2)
       AND ($3::text = ''
         OR title ILIKE '%' || $3 || '%'
         OR client_name ILIKE '%' || $3 || '%' OR client_handle ILIKE '%' || $3 || '%'
         OR freelancer_name ILIKE '%' || $3 || '%' OR freelancer_handle ILIKE '%' || $3 || '%'
         OR contract_id::text = $3)
     ORDER BY LEAST(
       COALESCE(client_restricted_since, 'infinity'::timestamptz),
       COALESCE(freelancer_restricted_since, 'infinity'::timestamptz)
     ) ASC, contract_created_at ASC
     LIMIT $4 OFFSET $5`,
    [LIVE_CONTRACT_STATUSES, reasonFilter, term, limit, offset]
  );
  return result.rows;
}

/** Counts per reason for the queue header. */
async function countRestrictedPartyContracts() {
  const result = await pool.query(
    `WITH parties AS (${CONTRACT_PARTIES_SQL}),
     rows AS (
       SELECT ${ownerUnavailableReasonSql('ca', { deactivated: false })} AS client_reason,
              ${ownerUnavailableReasonSql('fa', { deactivated: false })} AS freelancer_reason
       FROM parties pt
       JOIN accounts ca ON ca.account_id = pt.client_account_id
       JOIN accounts fa ON fa.account_id = pt.freelancer_account_id
     )
     SELECT COUNT(*) FILTER (WHERE client_reason IS NOT NULL OR freelancer_reason IS NOT NULL)::int AS total,
            COUNT(*) FILTER (WHERE 'banned' IN (client_reason, freelancer_reason))::int AS banned,
            COUNT(*) FILTER (WHERE 'locked' IN (client_reason, freelancer_reason))::int AS locked,
            COUNT(*) FILTER (WHERE 'suspended' IN (client_reason, freelancer_reason))::int AS suspended,
            COUNT(*) FILTER (WHERE 'team_leader' IN (client_reason, freelancer_reason))::int AS team_leader
     FROM rows`,
    [LIVE_CONTRACT_STATUSES]
  );
  return result.rows[0] || { total: 0, banned: 0, locked: 0, suspended: 0, team_leader: 0 };
}

/** A dashboard alert counts contracts this long past a ban or lock with no settlement yet. */
const STALE_RESTRICTED_DAYS = 7;

/**
 * Live contracts where a side has been banned or locked for STALE_RESTRICTED_DAYS or more and
 * nothing is resolving it (no open dispute). Suspensions end on their own and are left out.
 * Best effort: a failure reads as zero so a dashboard never breaks on it.
 * @returns {Promise<{ count: number, days: number }>}
 */
async function countStaleRestrictedContracts({ days = STALE_RESTRICTED_DAYS } = {}) {
  try {
    const result = await pool.query(
      `WITH parties AS (${CONTRACT_PARTIES_SQL}),
       rows AS (
         SELECT pt.contract_id,
                ${ownerUnavailableReasonSql('ca', { deactivated: false, suspended: false })} AS client_reason,
                ${ownerUnavailableReasonSql('fa', { deactivated: false, suspended: false })} AS freelancer_reason,
                ${RESTRICTED_SINCE_SQL('ca')} AS client_since,
                ${RESTRICTED_SINCE_SQL('fa')} AS freelancer_since
         FROM parties pt
         JOIN accounts ca ON ca.account_id = pt.client_account_id
         JOIN accounts fa ON fa.account_id = pt.freelancer_account_id
         WHERE NOT EXISTS (
           SELECT 1 FROM disputes d
           WHERE d.contract_id = pt.contract_id
             AND d.deleted_at IS NULL
             AND d.status <> 'closed'
         )
       )
       SELECT COUNT(*)::int AS n
       FROM rows
       WHERE (client_reason IS NOT NULL AND COALESCE(client_since, NOW()) <= NOW() - make_interval(days => $2::int))
          OR (freelancer_reason IS NOT NULL AND COALESCE(freelancer_since, NOW()) <= NOW() - make_interval(days => $2::int))`,
      [LIVE_CONTRACT_STATUSES, days]
    );
    return { count: Number(result.rows[0]?.n || 0), days };
  } catch (err) {
    console.warn('Stale restricted-contract count failed:', err.message);
    return { count: 0, days };
  }
}

/** The dashboard alert for stale restricted contracts, or null when there are none. */
function staleRestrictedAlert(stale, action) {
  if (!stale || !stale.count) return null;
  return {
    id: 'stale-restricted-contracts',
    message: `${stale.count} live contract${stale.count === 1 ? ' has' : 's have'} had a banned or locked party for ${stale.days}+ days with no dispute open — settle the escrow.`,
    severity: 'error',
    ...action,
  };
}

module.exports = {
  STALE_RESTRICTED_DAYS,
  countStaleRestrictedContracts,
  staleRestrictedAlert,
  LIVE_CONTRACT_STATUSES,
  listLiveContractsForAccount,
  listRestrictedPartyContracts,
  countRestrictedPartyContracts,
};
