/** Drop tickets.channel and tickets.related_dispute_id. */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE tickets
      DROP CONSTRAINT IF EXISTS tickets_related_dispute_id_fkey
  `);

  await pgm.db.query(`
    ALTER TABLE tickets
      DROP COLUMN IF EXISTS channel,
      DROP COLUMN IF EXISTS related_dispute_id
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS channel VARCHAR(50) NOT NULL DEFAULT 'web',
      ADD COLUMN IF NOT EXISTS related_dispute_id UUID
  `);

  await pgm.db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tickets_related_dispute_id_fkey'
      ) THEN
        ALTER TABLE tickets
          ADD CONSTRAINT tickets_related_dispute_id_fkey
          FOREIGN KEY (related_dispute_id) REFERENCES disputes(dispute_id);
      END IF;
    END $$;
  `);
};
