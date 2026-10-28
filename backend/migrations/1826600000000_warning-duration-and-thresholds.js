/**
 * Store duration on each named warning. Admin CRUD for warning-point thresholds.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
const { DEFAULT_THRESHOLDS } = require('../lib/WarningBands');

exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE warning_defs
      ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 14
  `);
  await pgm.db.query(`
    ALTER TABLE warning_defs
      DROP CONSTRAINT IF EXISTS warning_defs_duration_days_check
  `);
  await pgm.db.query(`
    ALTER TABLE warning_defs
      ADD CONSTRAINT warning_defs_duration_days_check
      CHECK (duration_days >= 1 AND duration_days <= 365)
  `);
  await pgm.db.query(`
    UPDATE warning_defs
    SET duration_days = CASE points
      WHEN 1 THEN 3
      WHEN 2 THEN 5
      WHEN 3 THEN 7
      WHEN 4 THEN 10
      WHEN 5 THEN 14
      WHEN 6 THEN 21
      WHEN 7 THEN 30
      WHEN 8 THEN 45
      WHEN 9 THEN 60
      WHEN 10 THEN 90
      ELSE 14
    END
    WHERE duration_days = 14
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS warning_thresholds (
      warning_threshold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      min_points INTEGER NOT NULL CHECK (min_points >= 0 AND min_points <= 9999),
      effect VARCHAR(40) NOT NULL CHECK (
        effect IN ('none', 'record', 'limited', 'restricted', 'frozen', 'auto_suspend')
      ),
      label VARCHAR(80) NOT NULL,
      suspend_days INTEGER CHECK (suspend_days IS NULL OR (suspend_days >= 1 AND suspend_days <= 365)),
      note TEXT,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await pgm.db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS warning_thresholds_min_points_active_uidx
      ON warning_thresholds (min_points)
      WHERE deleted_at IS NULL
  `);

  for (let index = 0; index < DEFAULT_THRESHOLDS.length; index += 1) {
    const row = DEFAULT_THRESHOLDS[index];
    await pgm.db.query(
      `
      INSERT INTO warning_thresholds (min_points, effect, label, suspend_days, is_system, sort_order)
      SELECT $1, $2, $3, $4, TRUE, $5
      WHERE NOT EXISTS (
        SELECT 1 FROM warning_thresholds
        WHERE min_points = $1 AND deleted_at IS NULL
      )
      `,
      [row.minPoints, row.effect, row.label, row.suspendDays, index]
    );
  }
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = async (pgm) => {
  await pgm.db.query('DROP TABLE IF EXISTS warning_thresholds');
  await pgm.db.query(`
    ALTER TABLE warning_defs
      DROP CONSTRAINT IF EXISTS warning_defs_duration_days_check
  `);
  await pgm.db.query(`
    ALTER TABLE warning_defs
      DROP COLUMN IF EXISTS duration_days
  `);
};
