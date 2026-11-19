const { pool } = require('../lib/Database');

/**
 * `merit_penalties`: punishments the merit engine applied. Each row has its own clock
 * (`ends_at`). A row is running while `ended_at IS NULL AND ends_at > NOW()`; the one-minute
 * sweep stamps `ended_at` once the clock runs out. Staff can end one early, and pardon, an
 * accepted appeal or rescinding the warning behind it end them too.
 */

const PENALTY_COLUMNS = `
  mp.merit_penalty_id, mp.account_id, mp.warning_threshold_id, mp.violation_id, mp.effect,
  mp.label, mp.min_points, mp.points_at_start, mp.duration_days, mp.starts_at, mp.ends_at,
  mp.ended_at, mp.end_reason, mp.ended_by_staff_id, mp.end_note, mp.created_at
`;

const RUNNING_SQL = 'mp.ended_at IS NULL AND mp.ends_at > NOW()';

function mapPenalty(row) {
  if (!row) return null;
  const minPoints = Number(row.min_points || 0);
  const pointsAtStart = Number(row.points_at_start || 0);
  return {
    id: row.merit_penalty_id,
    accountId: row.account_id,
    thresholdId: row.warning_threshold_id || null,
    violationId: row.violation_id || null,
    violationNumber: row.violation_number || null,
    effect: row.effect,
    label: row.label,
    minPoints,
    /** The merit level the rule sits at. */
    triggerMerit: Math.max(0, 100 - minPoints),
    pointsAtStart,
    /** The member's merit when it started. */
    meritAtStart: Math.max(0, 100 - pointsAtStart),
    durationDays: Number(row.duration_days || 0),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    endedAt: row.ended_at || null,
    endReason: row.end_reason || null,
    endedByStaffId: row.ended_by_staff_id || null,
    endNote: row.end_note || null,
    createdAt: row.created_at,
  };
}

async function listActiveMeritPenalties(accountId, db = pool) {
  const { rows } = await db.query(
    `
    SELECT ${PENALTY_COLUMNS}, v.violation_number
    FROM merit_penalties mp
    LEFT JOIN violations v ON v.violation_id = mp.violation_id
    WHERE mp.account_id = $1 AND ${RUNNING_SQL}
    ORDER BY mp.ends_at DESC
    `,
    [accountId]
  );
  return rows.map(mapPenalty);
}

async function listMeritPenaltyHistory(accountId, { limit = 20 } = {}) {
  const { rows } = await pool.query(
    `
    SELECT ${PENALTY_COLUMNS}, v.violation_number
    FROM merit_penalties mp
    LEFT JOIN violations v ON v.violation_id = mp.violation_id
    WHERE mp.account_id = $1
    ORDER BY mp.created_at DESC
    LIMIT $2
    `,
    [accountId, Math.max(1, Math.min(100, Number(limit) || 20))]
  );
  return rows.map(mapPenalty);
}

/** Running punishments across accounts, for the moderator Restrictions desks. */
async function listRunningMeritPenalties({ limit = 200 } = {}) {
  const { rows } = await pool.query(
    `
    SELECT ${PENALTY_COLUMNS}, v.violation_number
    FROM merit_penalties mp
    LEFT JOIN violations v ON v.violation_id = mp.violation_id
    WHERE ${RUNNING_SQL}
    ORDER BY mp.ends_at ASC
    LIMIT $1
    `,
    [Math.max(1, Math.min(500, Number(limit) || 200))]
  );
  return rows.map(mapPenalty);
}

async function getMeritPenalty(accountId, penaltyId, db = pool) {
  const { rows } = await db.query(
    `
    SELECT ${PENALTY_COLUMNS}, NULL::text AS violation_number
    FROM merit_penalties mp
    WHERE mp.account_id = $1 AND mp.merit_penalty_id::text = $2
    LIMIT 1
    `,
    [accountId, String(penaltyId)]
  );
  return mapPenalty(rows[0]);
}

/**
 * Start a punishment. A rule fires once per warning: a repeat for the same warning and rule is
 * ignored (returns null).
 */
async function insertMeritPenalty(db, {
  accountId,
  thresholdId = null,
  violationId = null,
  effect,
  label,
  minPoints,
  pointsAtStart,
  durationDays,
}) {
  const { rows } = await db.query(
    `
    INSERT INTO merit_penalties AS mp (
      account_id, warning_threshold_id, violation_id, effect, label, min_points,
      points_at_start, duration_days, starts_at, ends_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW() + make_interval(days => $8::int))
    ON CONFLICT (violation_id, effect, min_points) WHERE violation_id IS NOT NULL DO NOTHING
    RETURNING ${PENALTY_COLUMNS}
    `,
    [accountId, thresholdId, violationId, effect, String(label).slice(0, 80), minPoints, pointsAtStart, durationDays]
  );
  return mapPenalty(rows[0]);
}

/**
 * End running punishments now. Narrow by one penalty, the warning that started them, or a set
 * of effects; with none of those, every running punishment on the account ends.
 * @returns {Promise<object[]>} the rows that ended
 */
async function endMeritPenalties(db, {
  accountId,
  penaltyId = null,
  violationId = null,
  effects = null,
  reason,
  staffId = null,
  note = null,
}) {
  const { rows } = await db.query(
    `
    UPDATE merit_penalties mp
    SET ended_at = NOW(),
        end_reason = $5,
        ended_by_staff_id = $6,
        end_note = $7
    WHERE mp.account_id = $1
      AND ${RUNNING_SQL}
      AND ($2::text IS NULL OR mp.merit_penalty_id::text = $2::text)
      AND ($3::uuid IS NULL OR mp.violation_id = $3::uuid)
      AND ($4::text[] IS NULL OR mp.effect = ANY($4::text[]))
    RETURNING ${PENALTY_COLUMNS}
    `,
    [
      accountId,
      penaltyId ? String(penaltyId) : null,
      violationId || null,
      Array.isArray(effects) && effects.length ? effects : null,
      String(reason || 'staff').slice(0, 24),
      staffId || null,
      note ? String(note).slice(0, 1000) : null,
    ]
  );
  return rows.map(mapPenalty);
}

/**
 * Accepted appeal: running punishments end within 24 hours, never later than they would have.
 * The sweep closes them when the shortened clock runs out.
 */
async function shortenMeritPenaltiesForAppeal(db, accountId) {
  const { rowCount } = await db.query(
    `
    UPDATE merit_penalties mp
    SET ends_at = LEAST(mp.ends_at, NOW() + INTERVAL '24 hours'),
        end_reason = 'appeal'
    WHERE mp.account_id = $1 AND ${RUNNING_SQL}
    `,
    [accountId]
  );
  return rowCount || 0;
}

async function hasRunningMeritPenalty(accountId, { effects = null } = {}, db = pool) {
  const { rowCount } = await db.query(
    `
    SELECT 1 FROM merit_penalties mp
    WHERE mp.account_id = $1 AND ${RUNNING_SQL}
      AND ($2::text[] IS NULL OR mp.effect = ANY($2::text[]))
    LIMIT 1
    `,
    [accountId, Array.isArray(effects) && effects.length ? effects : null]
  );
  return rowCount > 0;
}

/**
 * Stamp punishments whose clock ran out. SKIP LOCKED keeps two sweepers from announcing the
 * same end twice.
 */
async function closeElapsedMeritPenalties({ limit = 200 } = {}) {
  const { rows } = await pool.query(
    `
    WITH due AS (
      SELECT merit_penalty_id
      FROM merit_penalties
      WHERE ended_at IS NULL AND ends_at <= NOW()
      ORDER BY ends_at
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE merit_penalties mp
    SET ended_at = mp.ends_at,
        end_reason = COALESCE(mp.end_reason, 'expired')
    FROM due
    WHERE mp.merit_penalty_id = due.merit_penalty_id
    RETURNING ${PENALTY_COLUMNS}
    `,
    [Math.max(1, Math.min(1000, Number(limit) || 200))]
  );
  return rows.map(mapPenalty);
}

/**
 * Active warning points just before a given warning, and that warning's own weight: the points
 * of warnings issued earlier that still count. Ordering by the warning's place in time (not by
 * "now minus this warning") keeps two warnings issued at once from hiding a crossing.
 */
async function pointsAroundWarning(accountId, violationId) {
  const { rows } = await pool.query(
    `
    WITH target AS (
      SELECT violation_id, created_at, LEAST(GREATEST(COALESCE(points, 1), 1), 10) AS weight
      FROM violations
      WHERE account_id = $1 AND violation_id = $2
    )
    SELECT
      (SELECT weight FROM target)::int AS weight,
      COALESCE((
        SELECT SUM(LEAST(GREATEST(COALESCE(v.points, 1), 1), 10))
        FROM violations v, target t
        WHERE v.account_id = $1
          AND v.violation_id <> t.violation_id
          AND v.deleted_at IS NULL
          AND LOWER(COALESCE(v.status, 'active')) IN ('active', 'open', 'pending')
          AND (v.expires_at IS NULL OR v.expires_at > NOW())
          AND (v.created_at, v.violation_id) < (t.created_at, t.violation_id)
      ), 0)::int AS before
    `,
    [accountId, violationId]
  );
  const row = rows[0] || {};
  if (row.weight == null) return null;
  return { before: Number(row.before || 0), weight: Number(row.weight || 0) };
}

module.exports = {
  mapPenalty,
  listActiveMeritPenalties,
  listMeritPenaltyHistory,
  listRunningMeritPenalties,
  getMeritPenalty,
  insertMeritPenalty,
  endMeritPenalties,
  shortenMeritPenaltiesForAppeal,
  hasRunningMeritPenalty,
  closeElapsedMeritPenalties,
  pointsAroundWarning,
};
