const { pool } = require('../lib/Database');

function mapActivityRow(row) {
  return {
    id: row.account_activity_id,
    accountId: row.account_id,
    accountName: row.account_name || null,
    accountHandle: row.account_handle || null,
    action: row.action,
    eventCode: row.event_code,
    referenceTable: row.reference_table || null,
    referencePrefix: row.reference_prefix || null,
    referenceId: row.reference_id || null,
    actorStaffId: row.actor_staff_id || null,
    actorAccountId: row.actor_account_id || null,
    actorName: row.actor_name || null,
    actorRole: row.actor_role || null,
    metadata: row.metadata || null,
    createdAt: row.created_at,
  };
}

/**
 * Append an account activity row. Never throws — logging must not break primary flows.
 */
async function recordAccountActivity({
  accountId,
  action,
  eventCode,
  referenceTable = null,
  referencePrefix = null,
  referenceId = null,
  actorStaffId = null,
  actorAccountId = null,
  metadata = null,
  client = null,
} = {}) {
  if (!accountId || !action || !eventCode) return null;
  const db = client || pool;
  try {
    const result = await db.query(
      `
      INSERT INTO account_activity (
        account_id, action, event_code,
        reference_table, reference_prefix, reference_id,
        actor_staff_id, actor_account_id, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
      RETURNING *
      `,
      [
        accountId,
        String(action).trim(),
        String(eventCode).trim().toUpperCase(),
        referenceTable,
        referencePrefix,
        referenceId != null ? String(referenceId) : null,
        actorStaffId || null,
        actorAccountId || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
    return mapActivityRow(result.rows[0]);
  } catch (err) {
    console.warn('account_activity insert skipped:', err.message);
    return null;
  }
}

async function listAccountActivity(accountId, { limit = 50 } = {}) {
  const result = await pool.query(
    `
    SELECT
      aa.*,
      a.display_name AS account_name,
      a.handle AS account_handle,
      COALESCE(sa.display_name, s.first_name || ' ' || s.last_name, ba.display_name) AS actor_name,
      s.role AS actor_role
    FROM account_activity aa
    LEFT JOIN accounts a ON a.account_id = aa.account_id
    LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
    LEFT JOIN accounts sa ON sa.account_id = s.account_id
    LEFT JOIN accounts ba ON ba.account_id = aa.actor_account_id
    WHERE aa.account_id = $1
    ORDER BY aa.created_at DESC
    LIMIT $2
    `,
    [accountId, Math.min(Math.max(Number(limit) || 50, 1), 200)]
  );
  return result.rows.map(mapActivityRow);
}

async function listRecentAccountActivity({ limit = 40 } = {}) {
  const result = await pool.query(
    `
    SELECT
      aa.*,
      a.display_name AS account_name,
      a.handle AS account_handle,
      COALESCE(sa.display_name, s.first_name || ' ' || s.last_name, ba.display_name) AS actor_name,
      s.role AS actor_role
    FROM account_activity aa
    LEFT JOIN accounts a ON a.account_id = aa.account_id
    LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
    LEFT JOIN accounts sa ON sa.account_id = s.account_id
    LEFT JOIN accounts ba ON ba.account_id = aa.actor_account_id
    ORDER BY aa.created_at DESC
    LIMIT $1
    `,
    [Math.min(Math.max(Number(limit) || 40, 1), 200)]
  );
  return result.rows.map(mapActivityRow);
}

async function fetchActivityForAccounts(accountIds, { perAccount = 12 } = {}) {
  const map = new Map();
  if (!accountIds?.length) return map;
  for (const id of accountIds) map.set(id, []);

  const result = await pool.query(
    `
    SELECT * FROM (
      SELECT
        aa.*,
        a.display_name AS account_name,
        a.handle AS account_handle,
        COALESCE(sa.display_name, s.first_name || ' ' || s.last_name, ba.display_name) AS actor_name,
        s.role AS actor_role,
        ROW_NUMBER() OVER (PARTITION BY aa.account_id ORDER BY aa.created_at DESC) AS rn
      FROM account_activity aa
      LEFT JOIN accounts a ON a.account_id = aa.account_id
      LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
      LEFT JOIN accounts sa ON sa.account_id = s.account_id
      LEFT JOIN accounts ba ON ba.account_id = aa.actor_account_id
      WHERE aa.account_id = ANY($1::uuid[])
    ) ranked
    WHERE rn <= $2
    ORDER BY created_at DESC
    `,
    [accountIds, Math.min(Math.max(Number(perAccount) || 12, 1), 50)]
  );

  for (const row of result.rows) {
    const list = map.get(row.account_id) || [];
    list.push(mapActivityRow(row));
    map.set(row.account_id, list);
  }
  return map;
}

module.exports = {
  recordAccountActivity,
  listAccountActivity,
  listRecentAccountActivity,
  fetchActivityForAccounts,
};
