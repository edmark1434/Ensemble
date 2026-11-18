/**
 * SQL for lifting warning points. A lift lowers `violations.points` (what still counts) and
 * keeps the issued value in `points_original`. A warning lifted to zero gets status `lifted`
 * so every "active warnings" filter drops it, while the Record still shows it.
 */

/** Same per-row weight as sumActiveWarningPoints: 1–10, a missing value counts as 1. */
const WEIGHT_SQL = 'LEAST(GREATEST(COALESCE(points, 1), 1), 10)';

/**
 * Active warnings for an account, locked for the lift. Longest-lasting first, so a lift takes
 * points that would otherwise count the longest; that shortens the time the member spends in a
 * band. Pass `violationId` to load one warning only.
 * @param {import('pg').PoolClient} client
 */
async function lockActiveWarnings(client, accountId, violationId = null) {
  const { rows } = await client.query(
    `
    SELECT violation_id, violation_number, type, expires_at,
           ${WEIGHT_SQL} AS weight,
           points_original
    FROM violations
    WHERE account_id = $1
      AND deleted_at IS NULL
      AND LOWER(COALESCE(status, 'active')) IN ('active', 'open', 'pending')
      AND (expires_at IS NULL OR expires_at > NOW())
      AND ($2::text IS NULL OR violation_id::text = $2 OR violation_number = $2)
    ORDER BY expires_at DESC NULLS FIRST, created_at DESC
    FOR UPDATE
    `,
    [accountId, violationId == null ? null : String(violationId)]
  );
  return rows.map((row) => ({
    violationId: row.violation_id,
    violationNumber: row.violation_number,
    type: row.type,
    expiresAt: row.expires_at,
    weight: Number(row.weight || 0),
    pointsOriginal: row.points_original == null ? null : Number(row.points_original),
  }));
}

/**
 * Lower one warning to `remaining` points; at zero it becomes `lifted`. The first lift records
 * the issued points in `points_original`.
 * @param {import('pg').PoolClient} client
 */
async function applyWarningLift(client, violationId, remaining) {
  const { rows } = await client.query(
    `
    UPDATE violations
    SET points_original = COALESCE(points_original, ${WEIGHT_SQL}),
        points = CASE WHEN $2::int > 0 THEN $2::int ELSE points END,
        status = CASE WHEN $2::int > 0 THEN status ELSE 'lifted' END
    WHERE violation_id = $1
    RETURNING violation_id, violation_number, type, points, points_original, status
    `,
    [violationId, Math.max(0, Math.round(remaining))]
  );
  return rows[0] || null;
}

module.exports = {
  lockActiveWarnings,
  applyWarningLift,
};
