/** Convert disputes.visibility from varchar to boolean (false=hidden, true=visible). */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS visibility_bool BOOLEAN
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET visibility_bool = CASE
      WHEN lower(btrim(COALESCE(visibility::text, ''))) IN ('public', 'parties', 'true', 't', '1', 'yes')
        THEN TRUE
      ELSE FALSE
    END
  `);

  await pgm.db.query(`
    ALTER TABLE disputes DROP COLUMN IF EXISTS visibility
  `);

  await pgm.db.query(`
    ALTER TABLE disputes
      RENAME COLUMN visibility_bool TO visibility
  `);

  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN visibility SET NOT NULL,
      ALTER COLUMN visibility SET DEFAULT FALSE
  `);

  await pgm.db.query(`
    DROP INDEX IF EXISTS idx_disputes_visibility
  `);

  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_disputes_visibility ON disputes (visibility)
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS visibility_text VARCHAR(20)
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET visibility_text = CASE
      WHEN visibility IS TRUE THEN 'public'
      ELSE 'pending'
    END
  `);

  await pgm.db.query(`DROP INDEX IF EXISTS idx_disputes_visibility`);
  await pgm.db.query(`ALTER TABLE disputes DROP COLUMN IF EXISTS visibility`);
  await pgm.db.query(`ALTER TABLE disputes RENAME COLUMN visibility_text TO visibility`);
  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN visibility SET NOT NULL,
      ALTER COLUMN visibility SET DEFAULT 'pending'
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_disputes_visibility ON disputes (visibility)
  `);
};
