const { pool } = require('../lib/Database');

function mapRow(row) {
  if (!row) return null;
  let desks = row.desks;
  if (typeof desks === 'string') {
    try { desks = JSON.parse(desks); } catch { desks = ['admin']; }
  }
  if (!Array.isArray(desks)) desks = ['admin'];
  const durationDays = row.duration_days == null ? null : Number(row.duration_days);
  return {
    punishment_def_id: row.punishment_def_id,
    id: row.slug,
    slug: row.slug,
    kind: row.kind,
    label: row.label,
    category: row.category,
    duration_days: durationDays,
    durationDays,
    permanent: durationDays == null,
    desks,
    note: row.note || '',
    is_system: Boolean(row.is_system),
    sort_order: Number(row.sort_order || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SELECT_COLS = `
  punishment_def_id, slug, kind, label, category, duration_days, desks, note, is_system, sort_order, created_at, updated_at
`;

async function listPunishmentDefs({ includeDeleted = false } = {}) {
  const { rows } = await pool.query(
    `
    SELECT ${SELECT_COLS}
    FROM punishment_defs
    WHERE ($1::boolean = TRUE OR deleted_at IS NULL)
    ORDER BY kind ASC, sort_order ASC, category ASC, label ASC
    `,
    [includeDeleted]
  );
  return rows.map(mapRow);
}

async function getPunishmentDefBySlug(slug) {
  const { rows } = await pool.query(
    `
    SELECT ${SELECT_COLS}
    FROM punishment_defs
    WHERE slug = $1 AND deleted_at IS NULL
    LIMIT 1
    `,
    [slug]
  );
  return mapRow(rows[0]);
}

async function getPunishmentDefById(punishmentDefId) {
  const { rows } = await pool.query(
    `
    SELECT ${SELECT_COLS}
    FROM punishment_defs
    WHERE punishment_def_id = $1 AND deleted_at IS NULL
    LIMIT 1
    `,
    [punishmentDefId]
  );
  return mapRow(rows[0]);
}

async function createPunishmentDef({
  slug,
  kind,
  label,
  category,
  durationDays,
  desks,
  note,
  isSystem = false,
  sortOrder = 0,
}) {
  const { rows } = await pool.query(
    `
    INSERT INTO punishment_defs (slug, kind, label, category, duration_days, desks, note, is_system, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
    RETURNING ${SELECT_COLS}
    `,
    [slug, kind, label, category, durationDays, JSON.stringify(desks), note || null, isSystem, sortOrder]
  );
  return mapRow(rows[0]);
}

async function updatePunishmentDef(punishmentDefId, {
  kind,
  label,
  category,
  durationDays,
  desks,
  note,
  sortOrder,
}) {
  const { rows } = await pool.query(
    `
    UPDATE punishment_defs
    SET kind = COALESCE($2, kind),
        label = COALESCE($3, label),
        category = COALESCE($4, category),
        duration_days = CASE WHEN $5::boolean THEN $6 ELSE duration_days END,
        desks = COALESCE($7::jsonb, desks),
        note = COALESCE($8, note),
        sort_order = COALESCE($9, sort_order),
        updated_at = NOW()
    WHERE punishment_def_id = $1 AND deleted_at IS NULL
    RETURNING ${SELECT_COLS}
    `,
    [
      punishmentDefId,
      kind || null,
      label || null,
      category || null,
      durationDays !== undefined,
      durationDays === undefined ? null : durationDays,
      desks ? JSON.stringify(desks) : null,
      note == null ? null : note,
      sortOrder == null ? null : sortOrder,
    ]
  );
  return mapRow(rows[0]);
}

async function softDeletePunishmentDef(punishmentDefId) {
  const { rows } = await pool.query(
    `
    UPDATE punishment_defs
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE punishment_def_id = $1 AND deleted_at IS NULL
    RETURNING punishment_def_id
    `,
    [punishmentDefId]
  );
  return Boolean(rows[0]);
}

module.exports = {
  listPunishmentDefs,
  getPunishmentDefBySlug,
  getPunishmentDefById,
  createPunishmentDef,
  updatePunishmentDef,
  softDeletePunishmentDef,
};
