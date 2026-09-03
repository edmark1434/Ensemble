/** Renumber disputes to sequential DIS-##### (ticket-style). */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    WITH ordered AS (
      SELECT
        dispute_id,
        50000 + ROW_NUMBER() OVER (
          ORDER BY COALESCE(opened_at, created_at), dispute_id
        ) AS seq
      FROM disputes
    )
    UPDATE disputes d
    SET dispute_number = 'DIS-' || o.seq::text
    FROM ordered o
    WHERE d.dispute_id = o.dispute_id
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  // Demo status-ish codes cannot be restored reliably; leave sequential numbers.
  await pgm.db.query(`SELECT 1`);
};
