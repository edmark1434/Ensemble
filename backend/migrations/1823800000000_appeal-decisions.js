/**
 * Appeal decisions, plus the ban and lock end times those decisions schedule.
 * Accepting an appeal sets an end time 24 hours out. Denying one blocks the
 * next appeal for 12 months, or permanently.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS ban_ends_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS lock_ends_at TIMESTAMPTZ
  `);
  await pgm.db.query(`
    ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS appeal_decision VARCHAR(32),
      ADD COLUMN IF NOT EXISTS appeal_decided_at TIMESTAMPTZ
  `);
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS account_appeal_holds (
      account_id UUID PRIMARY KEY REFERENCES accounts(account_id),
      decision VARCHAR(32) NOT NULL,
      blocked_until TIMESTAMPTZ,
      permanently_denied BOOLEAN NOT NULL DEFAULT FALSE,
      ticket_id UUID,
      staff_id UUID,
      decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`DROP TABLE IF EXISTS account_appeal_holds`);
  await pgm.db.query(`
    ALTER TABLE tickets
      DROP COLUMN IF EXISTS appeal_decision,
      DROP COLUMN IF EXISTS appeal_decided_at
  `);
  await pgm.db.query(`
    ALTER TABLE accounts
      DROP COLUMN IF EXISTS ban_ends_at,
      DROP COLUMN IF EXISTS lock_ends_at
  `);
};
