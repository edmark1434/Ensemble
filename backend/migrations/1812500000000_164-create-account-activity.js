/** Create account_activity — polymorphic audit/timeline for accounts. */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS account_activity (
      account_activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES accounts(account_id),
      action TEXT NOT NULL,
      event_code VARCHAR(80) NOT NULL,
      reference_table VARCHAR(50),
      reference_prefix VARCHAR(50),
      reference_id TEXT,
      actor_staff_id UUID REFERENCES staff(staff_id),
      actor_account_id UUID REFERENCES accounts(account_id),
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_account_activity_account_created
      ON account_activity (account_id, created_at DESC)
  `);

  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_account_activity_event_code
      ON account_activity (event_code)
  `);

  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_account_activity_created
      ON account_activity (created_at DESC)
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`DROP TABLE IF EXISTS account_activity`);
};
