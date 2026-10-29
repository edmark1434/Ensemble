const { pool } = require('../lib/Database');

function mapRow(row) {
  if (!row) return null;
  return {
    warning_threshold_id: row.warning_threshold_id,
    minPoints: Number(row.min_points),
    min_points: Number(row.min_points),
    effect: row.effect,
    label: row.label,
    suspendDays: row.suspend_days == null ? null : Number(row.suspend_days),
    suspend_days: row.suspend_days == null ? null : Number(row.suspend_days),
    note: row.note || '',
    is_system: Boolean(row.is_system),
    sort_order: Number(row.sort_order || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const COLUMNS = `
  warning_threshold_id, min_points, effect, label, suspend_days, note,
  is_system, sort_order, created_at, updated_at
`;

async function listWarningThresholds({ includeDeleted = false } = {}) {
  const { rows } = await pool.query(
    `
    SELECT ${COLUMNS}
    FROM warning_thresholds
    WHERE ($1::boolean = TRUE OR deleted_at IS NULL)
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
    WHERE warning_threshold_id = $1 AND deleted_at IS NULL
    LIMIT 1
    `,
    [thresholdId]
  );
  return mapRow(rows[0]);
}

async function getWarningThresholdByMinPoints(minPoints) {
  const { rows } = await pool.query(
    `
    SELECT ${COLUMNS}
    FROM warning_thresholds
    WHERE min_points = $1 AND deleted_at IS NULL
    LIMIT 1
    `,
    [minPoints]
  );
  return mapRow(rows[0]);
}

async function createWarningThreshold({
  minPoints,
  effect,
  label,
  suspendDays,
  note,
  isSystem = false,
  sortOrder = 0,
}) {
  const { rows } = await pool.query(
    `
    INSERT INTO warning_thresholds (min_points, effect, label, suspend_days, note, is_system, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${COLUMNS}
    `,
    [minPoints, effect, label, suspendDays, note || null, isSystem, sortOrder]
  );
  return mapRow(rows[0]);
}

async function updateWarningThreshold(thresholdId, {
  minPoints,
  effect,
  label,
  suspendDays,
  note,
  sortOrder,
}) {
  const { rows } = await pool.query(
    `
    UPDATE warning_thresholds
    SET min_points = COALESCE($2, min_points),
        effect = COALESCE($3, effect),
        label = COALESCE($4, label),
        suspend_days = CASE
          WHEN $5::boolean THEN $6
          ELSE suspend_days
        END,
        note = COALESCE($7, note),
        sort_order = COALESCE($8, sort_order),
        updated_at = NOW()
    WHERE warning_threshold_id = $1 AND deleted_at IS NULL
    RETURNING ${COLUMNS}
    `,
    [
      thresholdId,
      minPoints == null ? null : minPoints,
      effect || null,
      label || null,
      suspendDays !== undefined,
      suspendDays === undefined ? null : suspendDays,
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
    WHERE warning_threshold_id = $1 AND deleted_at IS NULL
    RETURNING warning_threshold_id
    `,
    [thresholdId]
  );
  return Boolean(rows[0]);
}

module.exports = {
  listWarningThresholds,
  getWarningThresholdById,
  getWarningThresholdByMinPoints,
  createWarningThreshold,
  updateWarningThreshold,
  softDeleteWarningThreshold,
};
