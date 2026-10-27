/**
 * Migration to add gig_id to teams table, supporting contractual workspaces for gig orders.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS gig_id UUID REFERENCES gigs(gig_id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS teams_gig_id_idx ON teams (gig_id);
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`
    DROP INDEX IF EXISTS teams_gig_id_idx;
    ALTER TABLE teams DROP COLUMN IF EXISTS gig_id;
  `);
};
