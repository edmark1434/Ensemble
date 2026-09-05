/** Drop violations.title — use type as the violation category label. */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    UPDATE violations
    SET type = COALESCE(NULLIF(TRIM(type), ''), NULLIF(TRIM(title), ''), 'warning')
  `);

  await pgm.db.query(`
    ALTER TABLE violations
      DROP COLUMN IF EXISTS title
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE violations
      ADD COLUMN IF NOT EXISTS title VARCHAR(255)
  `);

  await pgm.db.query(`
    UPDATE violations
    SET title = type
    WHERE title IS NULL
  `);
};
