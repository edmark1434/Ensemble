/**
 * Extra answers from the member ticket form. One row per question.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS ticket_form_values (
      ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
      field_key VARCHAR(80) NOT NULL,
      field_label VARCHAR(160) NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (ticket_id, field_key)
    )
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`DROP TABLE IF EXISTS ticket_form_values`);
};
