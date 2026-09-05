/** Add violations.expires_at so strikes can age out for merit recovery. */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE violations
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ
  `);

  // Active strikes: expire from created_at by points (1 → 30d, 2 → 60d, …; min 30d).
  await pgm.db.query(`
    UPDATE violations
    SET expires_at = created_at + (
      GREATEST(COALESCE(points, 1), 1) * INTERVAL '30 days'
    )
    WHERE expires_at IS NULL
      AND deleted_at IS NULL
      AND LOWER(COALESCE(status, 'active')) IN ('active', 'open', 'pending')
  `);

  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_violations_expires_at
      ON violations (expires_at)
      WHERE deleted_at IS NULL
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`DROP INDEX IF EXISTS idx_violations_expires_at`);
  await pgm.db.query(`
    ALTER TABLE violations
      DROP COLUMN IF EXISTS expires_at
  `);
};
