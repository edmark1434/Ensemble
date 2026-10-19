/**
 * Staff can schedule a ticket to close at a specific time.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS scheduled_close_at TIMESTAMPTZ
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS tickets_scheduled_close_at_idx
    ON tickets (scheduled_close_at)
    WHERE scheduled_close_at IS NOT NULL AND deleted_at IS NULL
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`DROP INDEX IF EXISTS tickets_scheduled_close_at_idx`);
  await pgm.db.query(`ALTER TABLE tickets DROP COLUMN IF EXISTS scheduled_close_at`);
};
