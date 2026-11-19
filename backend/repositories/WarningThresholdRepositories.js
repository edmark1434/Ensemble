const { pool } = require('../lib/Database');

function mapRow(row) {
  if (!row) return null;
  const durationDays = row.duration_days == null ? null : Number(row.duration_days);
  const minPoints = Number(row.min_points);
  return {
    warning_threshold_id: row.warning_threshold_id,
    minPoints,
    min_points: minPoints,
    /** Platform Merit at or below which this row starts (100 − minPoints). */
    triggerMerit: Math.max(0, 100 - minPoints),
    effect: row.effect,
    label: row.label,
    durationDays,
    duration_days: durationDays,
    note: row.note || '',
    is_system: Boolean(row.is_system),
    sort_order: Number(row.sort_order || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// The length is read through jsonb so thresholds still load before the timed-punishment
// migration (when only auto-suspend rows had a length, in `suspend_days`).
const COLUMNS = `
  warning_threshold_id, min_points, effect, label,
  COALESCE(
    (to_jsonb(warning_thresholds) ->> 'duration_days')::int,
    (to_jsonb(warning_thresholds) ->> 'suspend_days')::int
  ) AS duration_days,
  note, is_system, sort_order, created_at, updated_at
`;

/** Retired display rows (`none`, `record`) lock nothing and are not punishments. */
const PUNISHING = `effect NOT IN ('none', 'record')`;

async function listWarningThresholds({ includeDeleted = false } = {}) {
  const { rows } = await pool.query(
    `
    SELECT ${COLUMNS}
    FROM warning_thresholds
    WHERE ($1::boolean = TRUE OR deleted_at IS NULL)
      AND ${PUNISHING}
    ORDER BY min_points ASC, sort_order ASC, label ASC
    `,
    [includeDeleted]
  );
  return rows.map(mapRow);
}

async function getWarningThresholdById(thresholdId) {
  const { rows } = await pool.query(
    `
    SELECT ${COLUMNS}
    FROM warning_thresholds
    WHERE warning_threshold_id::text = $1 AND deleted_at IS NULL
    LIMIT 1
    `,
    [String(thresholdId)]
  );
  return mapRow(rows[0]);
}

/** The row with this trigger and punishment, if any (one per merit level and kind). */
async function getWarningThresholdByTrigger(minPoints, effect) {
  const { rows } = await pool.query(
    `
    SELECT ${COLUMNS}
    FROM warning_thresholds
    WHERE min_points = $1 AND effect = $2 AND deleted_at IS NULL
    LIMIT 1
    `,
    [minPoints, effect]
  );
  return mapRow(rows[0]);
}

async function createWarningThreshold({
  minPoints,
  effect,
  label,
  durationDays,
  note,
  isSystem = false,
  sortOrder = 0,
}) {
  const { rows } = await pool.query(
    `
    INSERT INTO warning_thresholds (min_points, effect, label, duration_days, note, is_system, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${COLUMNS}
    `,
    [minPoints, effect, label, durationDays, note || null, isSystem, sortOrder]
  );
  return mapRow(rows[0]);
}

async function updateWarningThreshold(thresholdId, {
  minPoints,
  effect,
  label,
  durationDays,
  note,
  sortOrder,
}) {
  const { rows } = await pool.query(
    `
    UPDATE warning_thresholds
    SET min_points = COALESCE($2, min_points),
        effect = COALESCE($3, effect),
        label = COALESCE($4, label),
        duration_days = COALESCE($5::smallint, duration_days),
        note = COALESCE($6, note),
        sort_order = COALESCE($7, sort_order),
        updated_at = NOW()
    WHERE warning_threshold_id::text = $1 AND deleted_at IS NULL
    RETURNING ${COLUMNS}
    `,
    [
      String(thresholdId),
      minPoints == null ? null : minPoints,
      effect || null,
      label || null,
      durationDays == null ? null : durationDays,
      note == null ? null : note,
      sortOrder == null ? null : sortOrder,
    ]
  );
  return mapRow(rows[0]);
}

async function softDeleteWarningThreshold(thresholdId) {
  const { rows } = await pool.query(
    `
    UPDATE warning_thresholds
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE warning_threshold_id::text = $1 AND deleted_at IS NULL
    RETURNING warning_threshold_id
    `,
    [String(thresholdId)]
  );
  return Boolean(rows[0]);
}

module.exports = {
  listWarningThresholds,
  getWarningThresholdById,
  getWarningThresholdByTrigger,
  createWarningThreshold,
  updateWarningThreshold,
  softDeleteWarningThreshold,
};
