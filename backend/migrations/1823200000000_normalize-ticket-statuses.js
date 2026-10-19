/**
 * Tickets use In Progress and Closed. Older Open, Escalated to Dev, and Resolved rows are folded in.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_enum`);
  await pgm.db.query(`
    UPDATE tickets
    SET status = 'In Progress', updated_at = NOW()
    WHERE status IN ('Open', 'Escalated to Dev')
  `);
  await pgm.db.query(`
    UPDATE tickets
    SET status = 'Closed',
        resolved_at = COALESCE(resolved_at, NOW()),
        updated_at = NOW()
    WHERE status = 'Resolved'
  `);
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_enum
    CHECK (status IN ('In Progress', 'Closed'))
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_enum`);
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_enum
    CHECK (status IN ('Open', 'In Progress', 'Escalated to Dev', 'Resolved', 'Closed'))
  `);
};
