/**
 * Named warning library. Staff pick a row; points are locked to it.
 * Seeded from the original hardcoded catalog.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
const { WARNING_PRESETS } = require('../lib/WarningCatalog');

exports.up = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE warning_defs (
      warning_def_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug VARCHAR(80) NOT NULL,
      label VARCHAR(120) NOT NULL,
      category VARCHAR(40) NOT NULL DEFAULT 'Other',
      points INTEGER NOT NULL CHECK (points >= 1 AND points <= 10),
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
    CREATE UNIQUE INDEX warning_defs_slug_active_uidx
      ON warning_defs (slug)
      WHERE deleted_at IS NULL
  `);
  await pgm.db.query(`
    CREATE INDEX warning_defs_category_sort_idx
      ON warning_defs (category, sort_order)
  `);

  for (let index = 0; index < WARNING_PRESETS.length; index += 1) {
    const row = WARNING_PRESETS[index];
    await pgm.db.query(
      `
      INSERT INTO warning_defs (slug, label, category, points, desks, note, is_system, sort_order)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, TRUE, $7)
      `,
      [
        row.id,
        row.label,
        row.category,
        Number(row.points),
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
  await pgm.db.query('DROP TABLE IF EXISTS warning_defs');
};
