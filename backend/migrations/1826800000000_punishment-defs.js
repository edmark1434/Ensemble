/**
 * Named standing-punishment library (ban / suspend / timeout).
 * Staff pick a row; duration is the default and can be overridden on issue.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
const { PUNISHMENT_PRESETS } = require('../lib/PunishmentCatalog');

exports.up = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE punishment_defs (
      punishment_def_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug VARCHAR(80) NOT NULL,
      kind VARCHAR(16) NOT NULL CHECK (kind IN ('ban', 'suspend', 'timeout')),
      label VARCHAR(120) NOT NULL,
      category VARCHAR(40) NOT NULL DEFAULT 'Other',
      duration_days INTEGER CHECK (duration_days IS NULL OR (duration_days >= 1 AND duration_days <= 365)),
      desks JSONB NOT NULL DEFAULT '["admin"]'::jsonb,
      note TEXT,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await pgm.db.query(`
    CREATE UNIQUE INDEX punishment_defs_slug_active_uidx
      ON punishment_defs (slug)
      WHERE deleted_at IS NULL
  `);
  await pgm.db.query(`
    CREATE INDEX punishment_defs_kind_sort_idx
      ON punishment_defs (kind, category, sort_order)
  `);

  for (let index = 0; index < PUNISHMENT_PRESETS.length; index += 1) {
    const row = PUNISHMENT_PRESETS[index];
    await pgm.db.query(
      `
      INSERT INTO punishment_defs (slug, kind, label, category, duration_days, desks, note, is_system, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, TRUE, $8)
      `,
      [
        row.id,
        row.kind,
        row.label,
        row.category,
        row.durationDays == null ? null : Number(row.durationDays),
        JSON.stringify(row.desks || ['admin']),
        row.note || null,
        index,
      ]
    );
  }
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = async (pgm) => {
  await pgm.db.query('DROP TABLE IF EXISTS punishment_defs');
};
