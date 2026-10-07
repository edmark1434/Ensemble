/**
 * Violations: drop issued_by_staff_id (use staff_id only).
 * Restrictions: add account_id; allow restriction without violation.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  // Prefer issued_by when present, then keep existing staff_id.
  await pgm.db.query(`
    UPDATE violations
    SET staff_id = COALESCE(issued_by_staff_id, staff_id)
    WHERE issued_by_staff_id IS NOT NULL
  `);

  await pgm.db.query(`
    ALTER TABLE violations
      DROP COLUMN IF EXISTS issued_by_staff_id
  `);

  await pgm.db.query(`
    ALTER TABLE restrictions
      ADD COLUMN IF NOT EXISTS account_id UUID
  `);

  await pgm.db.query(`
    UPDATE restrictions r
    SET account_id = v.account_id
    FROM violations v
    WHERE r.violation_id = v.violation_id
      AND r.account_id IS NULL
  `);

  // Drop any restriction that still has no account (orphan / bad seed).
  await pgm.db.query(`
    DELETE FROM restrictions
    WHERE account_id IS NULL
  `);

  await pgm.db.query(`
    ALTER TABLE restrictions
      ALTER COLUMN account_id SET NOT NULL
  `);

  await pgm.db.query(`
    ALTER TABLE restrictions
      ALTER COLUMN violation_id DROP NOT NULL
  `);

  await pgm.db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'restrictions_account_id_fkey'
      ) THEN
        ALTER TABLE restrictions
          ADD CONSTRAINT restrictions_account_id_fkey
          FOREIGN KEY (account_id) REFERENCES accounts(account_id);
      END IF;
    END $$;
  `);

  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_restrictions_account_id
      ON restrictions (account_id)
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`DROP INDEX IF EXISTS idx_restrictions_account_id`);

  await pgm.db.query(`
    ALTER TABLE restrictions
      DROP CONSTRAINT IF EXISTS restrictions_account_id_fkey
  `);

  // Cannot restore NOT NULL on violation_id for rows without a violation.
  await pgm.db.query(`
    DELETE FROM restrictions
    WHERE violation_id IS NULL
  `);

  await pgm.db.query(`
    ALTER TABLE restrictions
      ALTER COLUMN violation_id SET NOT NULL
  `);

  await pgm.db.query(`
    ALTER TABLE restrictions
      DROP COLUMN IF EXISTS account_id
  `);

  await pgm.db.query(`
    ALTER TABLE violations
      ADD COLUMN IF NOT EXISTS issued_by_staff_id UUID
  `);

  await pgm.db.query(`
    UPDATE violations
    SET issued_by_staff_id = staff_id
    WHERE issued_by_staff_id IS NULL
  `);
};
