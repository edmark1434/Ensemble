/**
 * Teams have no Platform Merit, so a warning staff issue against a team lands on the team's
 * leader (Owner). `violations.team_account_id` remembers which team it was issued through, so
 * the team's record lists it even after ownership changes (docs/punishment-system.md §8.10).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE violations
      ADD COLUMN IF NOT EXISTS team_account_id uuid NULL
        REFERENCES accounts(account_id) ON DELETE SET NULL
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS violations_team_account_id_idx
      ON violations (team_account_id)
      WHERE team_account_id IS NOT NULL
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`DROP INDEX IF EXISTS violations_team_account_id_idx`);
  await pgm.db.query(`ALTER TABLE violations DROP COLUMN IF EXISTS team_account_id`);
};
