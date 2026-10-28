const { pool } = require('../lib/Database');

function mapRow(row) {
  if (!row) return null;
  let desks = row.desks;
  if (typeof desks === 'string') {
    try { desks = JSON.parse(desks); } catch { desks = ['admin']; }
  }
  if (!Array.isArray(desks)) desks = ['admin'];
  return {
    warning_def_id: row.warning_def_id,
    id: row.slug,
    slug: row.slug,
    label: row.label,
    category: row.category,
    points: Number(row.points),
    duration_days: Number(row.duration_days || 14),
    durationDays: Number(row.duration_days || 14),
    desks,
    note: row.note || '',
    is_system: Boolean(row.is_system),
    sort_order: Number(row.sort_order || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listWarningDefs({ includeDeleted = false } = {}) {
  const { rows } = await pool.query(
    `
    SELECT warning_def_id, slug, label, category, points, duration_days, desks, note, is_system, sort_order, created_at, updated_at
    FROM warning_defs
    WHERE ($1::boolean = TRUE OR deleted_at IS NULL)
    ORDER BY sort_order ASC, category ASC, label ASC
    `,
    [includeDeleted]
  );
  return rows.map(mapRow);
}

async function getWarningDefBySlug(slug) {
  const { rows } = await pool.query(
    `
    SELECT warning_def_id, slug, label, category, points, duration_days, desks, note, is_system, sort_order, created_at, updated_at
    FROM warning_defs
    WHERE slug = $1 AND deleted_at IS NULL
    LIMIT 1
    `,
    [slug]
  );
  return mapRow(rows[0]);
}

async function getWarningDefByLabel(label) {
  const { rows } = await pool.query(
    `
    SELECT warning_def_id, slug, label, category, points, duration_days, desks, note, is_system, sort_order, created_at, updated_at
    FROM warning_defs
    WHERE LOWER(label) = LOWER($1) AND deleted_at IS NULL
    LIMIT 1
    `,
    [label]
  );
  return mapRow(rows[0]);
}

async function getWarningDefById(warningDefId) {
  const { rows } = await pool.query(
    `
    SELECT warning_def_id, slug, label, category, points, duration_days, desks, note, is_system, sort_order, created_at, updated_at
    FROM warning_defs
    WHERE warning_def_id = $1 AND deleted_at IS NULL
    LIMIT 1
    `,
    [warningDefId]
  );
  return mapRow(rows[0]);
}

async function createWarningDef({ slug, label, category, points, durationDays, desks, note, isSystem = false, sortOrder = 0 }) {
  const { rows } = await pool.query(
    `
    INSERT INTO warning_defs (slug, label, category, points, duration_days, desks, note, is_system, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
    RETURNING warning_def_id, slug, label, category, points, duration_days, desks, note, is_system, sort_order, created_at, updated_at
    `,
    [slug, label, category, points, durationDays, JSON.stringify(desks), note || null, isSystem, sortOrder]
  );
  return mapRow(rows[0]);
}

async function updateWarningDef(warningDefId, { label, category, points, durationDays, desks, note, sortOrder }) {
  const { rows } = await pool.query(
    `
    UPDATE warning_defs
    SET label = COALESCE($2, label),
        category = COALESCE($3, category),
        points = COALESCE($4, points),
        duration_days = COALESCE($5, duration_days),
        desks = COALESCE($6::jsonb, desks),
        note = COALESCE($7, note),
        sort_order = COALESCE($8, sort_order),
        updated_at = NOW()
    WHERE warning_def_id = $1 AND deleted_at IS NULL
    RETURNING warning_def_id, slug, label, category, points, duration_days, desks, note, is_system, sort_order, created_at, updated_at
    `,
    [
      warningDefId,
      label || null,
      category || null,
      points == null ? null : points,
      durationDays == null ? null : durationDays,
      desks ? JSON.stringify(desks) : null,
      note == null ? null : note,
      sortOrder == null ? null : sortOrder,
    ]
  );
  return mapRow(rows[0]);
}

async function softDeleteWarningDef(warningDefId) {
  const { rows } = await pool.query(
    `
    UPDATE warning_defs
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE warning_def_id = $1 AND deleted_at IS NULL
    RETURNING warning_def_id
    `,
    [warningDefId]
  );
  return Boolean(rows[0]);
}

module.exports = {
  listWarningDefs,
  getWarningDefBySlug,
  getWarningDefByLabel,
  getWarningDefById,
  createWarningDef,
  updateWarningDef,
  softDeleteWarningDef,
};
