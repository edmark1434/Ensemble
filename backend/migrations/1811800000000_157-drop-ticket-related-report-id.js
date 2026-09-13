/** Drop tickets.related_report_id — tickets no longer link to reports. */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE tickets
      DROP CONSTRAINT IF EXISTS tickets_related_report_id_fkey
  `);

  await pgm.db.query(`
    ALTER TABLE tickets
      DROP COLUMN IF EXISTS related_report_id
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS related_report_id UUID
  `);

  await pgm.db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tickets_related_report_id_fkey'
      ) THEN
        ALTER TABLE tickets
          ADD CONSTRAINT tickets_related_report_id_fkey
          FOREIGN KEY (related_report_id) REFERENCES reports(report_id);
      END IF;
    END $$;
  `);
};
