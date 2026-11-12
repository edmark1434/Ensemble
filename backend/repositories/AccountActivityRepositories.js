const { pool } = require('../lib/Database');
const { categoryPredicate } = require('../lib/ActivityCatalog');

/**
 * Every read of `account_activity` goes through this projection so the activity
 * log, an account timeline and a single-row lookup all expose the same fields:
 * the target account, the staff member or account that acted, and — when the
 * row was reversed — who reversed it.
 */
const ACTIVITY_SELECT = `
  SELECT
    aa.account_activity_id,
    aa.account_id,
    aa.action,
    aa.event_code,
    aa.reference_table,
    aa.reference_prefix,
    aa.reference_id,
    aa.actor_staff_id,
    aa.actor_account_id,
    aa.metadata,
    aa.created_at,
    a.display_name AS account_name,
    a.handle AS account_handle,
    a.status AS account_status,
    COALESCE(
      sa.display_name,
      NULLIF(TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')), ''),
      ba.display_name
    ) AS actor_name,
    s.role AS actor_role,
    COALESCE(sa.handle, ba.handle) AS actor_handle,
    COALESCE(
      rsa.display_name,
      NULLIF(TRIM(COALESCE(rs.first_name, '') || ' ' || COALESCE(rs.last_name, '')), '')
    ) AS reversed_by_name,
    rs.role AS reversed_by_role
  FROM account_activity aa
  LEFT JOIN accounts a ON a.account_id = aa.account_id
  LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
  LEFT JOIN accounts sa ON sa.account_id = s.account_id
  LEFT JOIN accounts ba ON ba.account_id = aa.actor_account_id
  LEFT JOIN staff rs ON rs.staff_id::text = (aa.metadata->>'reversedByStaffId')
  LEFT JOIN accounts rsa ON rsa.account_id = rs.account_id
`;

function parseMetadata(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function mapActivityRow(row) {
  const metadata = parseMetadata(row.metadata);
  return {
    id: row.account_activity_id,
    accountId: row.account_id,
    accountName: row.account_name || null,
    accountHandle: row.account_handle || null,
    accountStatus: row.account_status || null,
    action: row.action,
    eventCode: row.event_code,
    referenceTable: row.reference_table || null,
    referencePrefix: row.reference_prefix || null,
    referenceId: row.reference_id || null,
    actorStaffId: row.actor_staff_id || null,
    actorAccountId: row.actor_account_id || null,
    actorName: row.actor_name || null,
    actorRole: row.actor_role || null,
    actorHandle: row.actor_handle || null,
    reversedByName: row.reversed_by_name || null,
    reversedByRole: row.reversed_by_role || null,
    metadata,
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
    ${ACTIVITY_SELECT}
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
    ${ACTIVITY_SELECT}
    ORDER BY aa.created_at DESC
    LIMIT $1
    `,
    [Math.min(Math.max(Number(limit) || 40, 1), 500)]
  );
  return result.rows.map(mapActivityRow);
}

const SORT_CLAUSES = {
  newest: 'aa.created_at DESC',
  oldest: 'aa.created_at ASC',
  action: 'aa.action ASC, aa.created_at DESC',
  event: 'aa.event_code ASC, aa.created_at DESC',
  target: 'COALESCE(a.display_name, a.handle) ASC, aa.created_at DESC',
};

/**
 * One page of the activity log with its matching total.
 *
 * Filters are applied in SQL so the total, the facet counts and the page always
 * describe the same set of rows. `category` reuses the catalog's ordered rules
 * so it matches the category each row is labelled with.
 *
 * @param options.search {string} matches action, event code, account name/handle, staff name and metadata text
 * @param options.category {string} category id from the activity catalog
 * @param options.eventCode {string} exact event code
 * @param options.role {string} staff role of the actor, or `system` for rows with no actor
 * @param options.state {string} `reversed`, `active` (not reversed) or `all`
 * @param options.accountId {string} only rows for this target account
 * @param options.from / options.to {string} inclusive ISO date bounds
 * @param options.sort {string} key of SORT_CLAUSES
 */
async function searchAccountActivity({
  search = '',
  category = 'all',
  eventCode = 'all',
  role = 'all',
  state = 'all',
  accountId = null,
  from = null,
  to = null,
  sort = 'newest',
  limit = 50,
  offset = 0,
} = {}) {
  const where = [];
  const params = [];

  const q = String(search || '').trim();
  if (q) {
    params.push(`%${q}%`);
    const p = `$${params.length}`;
    where.push(`(
      aa.action ILIKE ${p}
      OR aa.event_code ILIKE ${p}
      OR COALESCE(aa.reference_id, '') ILIKE ${p}
      OR COALESCE(aa.reference_prefix, '') ILIKE ${p}
      OR COALESCE(a.display_name, '') ILIKE ${p}
      OR COALESCE(a.handle, '') ILIKE ${p}
      OR COALESCE(sa.display_name, '') ILIKE ${p}
      OR COALESCE(TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')), '') ILIKE ${p}
      OR COALESCE(ba.display_name, '') ILIKE ${p}
      OR COALESCE(s.role, '') ILIKE ${p}
      OR COALESCE(aa.metadata::text, '') ILIKE ${p}
    )`);
  }

  if (category && category !== 'all') {
    const predicate = categoryPredicate(String(category).toLowerCase(), params.length + 1);
    if (predicate) {
      where.push(`(${predicate.sql})`);
      params.push(...predicate.params);
    }
  }

  if (eventCode && eventCode !== 'all') {
    params.push(String(eventCode).toUpperCase());
    where.push(`UPPER(aa.event_code) = $${params.length}`);
  }

  if (role && role !== 'all') {
    if (String(role).toLowerCase() === 'system') {
      where.push('aa.actor_staff_id IS NULL AND aa.actor_account_id IS NULL');
    } else {
      params.push(String(role));
      where.push(`LOWER(COALESCE(s.role, '')) = LOWER($${params.length})`);
    }
  }

  const normalizedState = String(state || 'all').toLowerCase();
  if (normalizedState === 'reversed') {
    where.push(`COALESCE(aa.metadata->>'reversed', 'false') = 'true'`);
  } else if (normalizedState === 'active') {
    where.push(`COALESCE(aa.metadata->>'reversed', 'false') <> 'true'`);
  }

  if (accountId) {
    params.push(String(accountId));
    where.push(`aa.account_id::text = $${params.length}`);
  }

  if (from) {
    params.push(from);
    where.push(`aa.created_at >= $${params.length}::timestamp`);
  }
  if (to) {
    params.push(to);
    // Inclusive end: a bare date covers the whole day.
    where.push(`aa.created_at < ($${params.length}::timestamp + INTERVAL '1 day')`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = SORT_CLAUSES[String(sort)] || SORT_CLAUSES.newest;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const [rows, totals] = await Promise.all([
    pool.query(
      `${ACTIVITY_SELECT} ${whereSql} ORDER BY ${orderSql} LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    ),
    pool.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(aa.metadata->>'reversed', 'false') = 'true')::int AS reversed,
        COUNT(DISTINCT aa.account_id)::int AS accounts,
        COUNT(DISTINCT aa.actor_staff_id)::int AS actors,
        COUNT(*) FILTER (WHERE aa.created_at >= NOW() - INTERVAL '24 hours')::int AS last_24h,
        COUNT(*) FILTER (WHERE aa.created_at >= NOW() - INTERVAL '7 days')::int AS last_7d,
        MIN(aa.created_at) AS oldest,
        MAX(aa.created_at) AS newest
      FROM account_activity aa
      LEFT JOIN accounts a ON a.account_id = aa.account_id
      LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
      LEFT JOIN accounts sa ON sa.account_id = s.account_id
      LEFT JOIN accounts ba ON ba.account_id = aa.actor_account_id
      ${whereSql}
      `,
      params
    ),
  ]);

  const t = totals.rows[0] || {};
  return {
    rows: rows.rows.map(mapActivityRow),
    total: Number(t.total || 0),
    stats: {
      total: Number(t.total || 0),
      reversed: Number(t.reversed || 0),
      accounts: Number(t.accounts || 0),
      actors: Number(t.actors || 0),
      last24h: Number(t.last_24h || 0),
      last7d: Number(t.last_7d || 0),
      oldest: t.oldest || null,
      newest: t.newest || null,
    },
  };
}

/** Event codes present in the table, with counts, for the log's filter list. */
async function listAccountActivityEventCodes() {
  const result = await pool.query(`
    SELECT UPPER(event_code) AS event_code, COUNT(*)::int AS count
    FROM account_activity
    GROUP BY 1
    ORDER BY count DESC, 1 ASC
  `);
  return result.rows.map((row) => ({ eventCode: row.event_code, count: Number(row.count) }));
}

/** Staff roles that appear as actors, for the log's filter list. */
async function listAccountActivityActorRoles() {
  const result = await pool.query(`
    SELECT s.role AS role, COUNT(*)::int AS count
    FROM account_activity aa
    INNER JOIN staff s ON s.staff_id = aa.actor_staff_id
    WHERE s.role IS NOT NULL
    GROUP BY 1
    ORDER BY count DESC, 1 ASC
  `);
  return result.rows.map((row) => ({ role: row.role, count: Number(row.count) }));
}

async function fetchActivityForAccounts(accountIds, { perAccount = 12 } = {}) {
  const map = new Map();
  if (!accountIds?.length) return map;
  for (const id of accountIds) map.set(id, []);

  const result = await pool.query(
    `
    SELECT * FROM (
      SELECT
        base.*,
        ROW_NUMBER() OVER (PARTITION BY base.account_id ORDER BY base.created_at DESC) AS rn
      FROM (
        ${ACTIVITY_SELECT}
        WHERE aa.account_id = ANY($1::uuid[])
      ) base
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

/** Activity rows that point at one record, newest first (for example a project). */
async function listActivityForReference(referenceTable, referenceId, { limit = 25 } = {}) {
  if (!referenceTable || !referenceId) return [];
  const result = await pool.query(
    `
    ${ACTIVITY_SELECT}
    WHERE aa.reference_table = $1 AND aa.reference_id = $2
    ORDER BY aa.created_at DESC
    LIMIT $3
    `,
    [String(referenceTable), String(referenceId), Math.min(Math.max(Number(limit) || 25, 1), 100)]
  );
  return result.rows.map(mapActivityRow);
}

async function getAccountActivityById(activityId) {
  if (!activityId) return null;
  const result = await pool.query(
    `
    ${ACTIVITY_SELECT}
    WHERE aa.account_activity_id = $1::uuid
    LIMIT 1
    `,
    [activityId]
  );
  return result.rows[0] ? mapActivityRow(result.rows[0]) : null;
}

async function markAccountActivityReversed(activityId, { reversedByStaffId = null, note = null } = {}) {
  if (!activityId) return null;
  const result = await pool.query(
    `
    UPDATE account_activity
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'reversed', true,
      'reversedAt', to_jsonb(NOW()::text),
      'reversedByStaffId', to_jsonb($2::text),
      'reverseNote', to_jsonb($3::text)
    )
    WHERE account_activity_id = $1::uuid
    RETURNING account_activity_id
    `,
    [activityId, reversedByStaffId != null ? String(reversedByStaffId) : null, note]
  );
  return result.rows[0] || null;
}

module.exports = {
  recordAccountActivity,
  listAccountActivity,
  listRecentAccountActivity,
  searchAccountActivity,
  listAccountActivityEventCodes,
  listAccountActivityActorRoles,
  listActivityForReference,
  fetchActivityForAccounts,
  getAccountActivityById,
  markAccountActivityReversed,
};
