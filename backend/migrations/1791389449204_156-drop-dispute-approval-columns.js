/** Drop disputes.approved_at and approved_by_staff_id — visibility + status are enough. */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE disputes
      DROP CONSTRAINT IF EXISTS disputes_approved_by_staff_id_fkey
  `);

  await pgm.db.query(`
    ALTER TABLE disputes
      DROP COLUMN IF EXISTS approved_at,
      DROP COLUMN IF EXISTS approved_by_staff_id
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS approved_by_staff_id UUID
  `);

  await pgm.db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'disputes_approved_by_staff_id_fkey'
      ) THEN
        ALTER TABLE disputes
          ADD CONSTRAINT disputes_approved_by_staff_id_fkey
          FOREIGN KEY (approved_by_staff_id) REFERENCES staff(staff_id);
      END IF;
    END $$;
  `);
};
