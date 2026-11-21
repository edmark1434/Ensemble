const { pool } = require('../lib/Database');
const { CLOSED_REPORT_STATUSES } = require('../lib/ReportEnums');

/**
 * Reads behind the platform-view moderation panel: the member content a staff member is
 * looking at, who owns it, open reports on it and what staff already did. Nothing here
 * writes; actions go through the existing desk services.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

/** Identity and standing basics for accounts, with whether each one is a staff account. */
async function getAccountBasics(accountIds) {
  const ids = [...new Set((accountIds || []).filter(isUuid).map(String))];
  if (!ids.length) return [];
  const result = await pool.query(
    `
    SELECT a.account_id, a.type, a.status, a.handle, a.display_name, a.tagline, a.description,
           a.deleted_at, s.staff_id, s.role AS staff_role
    FROM accounts a
    LEFT JOIN staff s ON s.account_id = a.account_id
    WHERE a.account_id = ANY($1::uuid[])
    `,
    [ids]
  );
  return result.rows;
}

async function getJobForModeration(jobId) {
  if (!isUuid(jobId)) return null;
  const result = await pool.query(
    `SELECT job_id, title, description, status, deleted_at, client_account_id, team_id
     FROM jobs WHERE job_id = $1 LIMIT 1`,
    [jobId]
  );
  return result.rows[0] || null;
}

async function getGigForModeration(gigId) {
  if (!isUuid(gigId)) return null;
  const result = await pool.query(
    `SELECT gig_id, title, description, status, deleted_at, freelancer_account_id
     FROM gigs WHERE gig_id = $1 LIMIT 1`,
    [gigId]
  );
  return result.rows[0] || null;
}

/**
 * A market asset with its newest listing. The seller is the account that submitted that
 * listing (the same rule the asset page uses), and Ensemble's own assets are flagged.
 */
async function getAssetForModeration(assetId) {
  if (!isUuid(assetId)) return null;
  const result = await pool.query(
    `
    SELECT ma.market_asset_id, ma.name, ma.description, ma.status, ma.deleted_at,
           COALESCE(ma.is_admin_asset, FALSE) AS is_admin_asset,
           l.listing_id, l.listing_number, l.title AS listing_title, l.status AS listing_status,
           l.submitted_by_account_id
    FROM market_assets ma
    LEFT JOIN LATERAL (
      SELECT listing_id, listing_number, title, status, submitted_by_account_id
      FROM marketplace_listings
      WHERE market_asset_id = ma.market_asset_id
      ORDER BY created_at DESC, listing_id DESC
      LIMIT 1
    ) l ON TRUE
    WHERE ma.market_asset_id = $1
    LIMIT 1
    `,
    [assetId]
  );
  return result.rows[0] || null;
}

/** A team by team id or by its account id (team pages accept both). */
async function getTeamForModeration(teamKey) {
  if (!isUuid(teamKey)) return null;
  const result = await pool.query(
    `
    SELECT t.team_id, t.account_id, t.deleted_at, a.display_name, a.handle, a.description,
           a.tagline, a.status
    FROM teams t
    JOIN accounts a ON a.account_id = t.account_id
    WHERE t.team_id = $1 OR t.account_id = $1
    LIMIT 1
    `,
    [teamKey]
  );
  return result.rows[0] || null;
}

/** A dispute by id or number, with both parties. */
async function getDisputeForModeration(idOrNumber) {
  const key = String(idOrNumber || '').trim();
  if (!key || key.length > 64) return null;
  const result = await pool.query(
    `
    SELECT dispute_id, dispute_number, status, by_account_id, for_account_id, deleted_at
    FROM disputes
    WHERE ${isUuid(key) ? 'dispute_id = $1::uuid' : 'dispute_number = $1'}
    LIMIT 1
    `,
    [key]
  );
  return result.rows[0] || null;
}

/**
 * Open reports on the item (`subjects`: `{ targetType, targetId }` pairs) or against any of the
 * accounts involved. Each row says which of the two it matched, so the panel can tell "this
 * comment was reported" apart from "this member has other open reports".
 */
async function listOpenReports({ subjects = [], accountIds = [] } = {}) {
  const types = subjects.map((s) => String(s.targetType || '').toLowerCase());
  const ids = subjects.map((s) => String(s.targetId || ''));
  const accounts = [...new Set(accountIds.filter(isUuid).map(String))];
  if (!types.length && !accounts.length) return [];
  const result = await pool.query(
    `
    SELECT r.report_id, r.report_number, r.status, r.priority, r.type, r.target_type, r.target_id,
           r.for_account_id, r.created_at,
           EXISTS (
             SELECT 1 FROM unnest($1::text[], $2::text[]) AS s(t, i)
             WHERE LOWER(r.target_type) = s.t AND r.target_id = s.i
           ) AS on_subject
    FROM reports r
    WHERE r.deleted_at IS NULL
      AND LOWER(COALESCE(r.status, 'open')) <> ALL($4::text[])
      AND (
        EXISTS (
          SELECT 1 FROM unnest($1::text[], $2::text[]) AS s(t, i)
          WHERE LOWER(r.target_type) = s.t AND r.target_id = s.i
        )
        OR r.for_account_id = ANY($3::uuid[])
      )
    ORDER BY on_subject DESC, r.created_at DESC
    LIMIT 25
    `,
    [types, ids, accounts, [...CLOSED_REPORT_STATUSES]]
  );
  return result.rows;
}

/** Staff actions on these accounts in the last `hours`, newest first, with who took them. */
async function listRecentStaffActions(accountIds, { hours = 24, limit = 20 } = {}) {
  const accounts = [...new Set((accountIds || []).filter(isUuid).map(String))];
  if (!accounts.length) return [];
  const result = await pool.query(
    `
    SELECT aa.account_activity_id, aa.account_id, aa.action, aa.event_code, aa.metadata, aa.created_at,
           aa.actor_staff_id, s.role AS actor_role,
           COALESCE(sa.display_name, NULLIF(TRIM(CONCAT(s.first_name, ' ', s.last_name)), ''), 'Staff') AS actor_name
    FROM account_activity aa
    LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
    LEFT JOIN accounts sa ON sa.account_id = s.account_id
    WHERE aa.account_id = ANY($1::uuid[])
      AND aa.actor_staff_id IS NOT NULL
      AND aa.created_at > NOW() - make_interval(hours => $2::int)
    ORDER BY aa.created_at DESC
    LIMIT $3
    `,
    [accounts, Math.max(1, Math.min(168, Number(hours) || 24)), Math.max(1, Math.min(50, Number(limit) || 20))]
  );
  return result.rows;
}

module.exports = {
  isUuid,
  getAccountBasics,
  getJobForModeration,
  getGigForModeration,
  getAssetForModeration,
  getTeamForModeration,
  getDisputeForModeration,
  listOpenReports,
  listRecentStaffActions,
};
