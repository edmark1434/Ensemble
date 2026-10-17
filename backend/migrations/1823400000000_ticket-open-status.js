/**
 * New tickets start as Open. In Progress and Closed stay valid.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_enum`);
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_enum
    CHECK (status IN ('Open', 'In Progress', 'Closed'))
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`
    UPDATE tickets
    SET status = 'In Progress', updated_at = NOW()
    WHERE status = 'Open'
  `);
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_enum`);
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_enum
    CHECK (status IN ('In Progress', 'Closed'))
  `);
};
