/**
 * Support Contractual Team Projects and milestone-linked taskboards.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  // 1. Extend teams table with contractual project support
  await pgm.db.query(`
    ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS team_type VARCHAR(20) NOT NULL DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(job_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
  `);

  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS teams_team_type_idx ON teams (team_type);
    CREATE INDEX IF NOT EXISTS teams_job_id_idx ON teams (job_id);
    CREATE INDEX IF NOT EXISTS teams_is_archived_idx ON teams (is_archived);
  `);

  // 2. Set default visibility for standard teams to 'Private'
  await pgm.db.query(`
    ALTER TABLE teams
    ALTER COLUMN visibility SET DEFAULT 'Private';
  `);

  // 3. Extend team_workspace_tasks with milestone role linkage, dependency locking, and checklist
  await pgm.db.query(`
    ALTER TABLE team_workspace_tasks
    ADD COLUMN IF NOT EXISTS job_milestone_id UUID REFERENCES job_milestones(job_milestone_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);

  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS team_workspace_tasks_milestone_idx ON team_workspace_tasks (job_milestone_id);
    CREATE INDEX IF NOT EXISTS team_workspace_tasks_locked_idx ON team_workspace_tasks (is_locked);
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`DROP INDEX IF EXISTS team_workspace_tasks_locked_idx`);
  await pgm.db.query(`DROP INDEX IF EXISTS team_workspace_tasks_milestone_idx`);
  await pgm.db.query(`
    ALTER TABLE team_workspace_tasks
    DROP COLUMN IF EXISTS checklist,
    DROP COLUMN IF EXISTS is_locked,
    DROP COLUMN IF EXISTS job_milestone_id;
  `);

  await pgm.db.query(`
    ALTER TABLE teams
    ALTER COLUMN visibility SET DEFAULT 'Public';
  `);

  await pgm.db.query(`DROP INDEX IF EXISTS teams_is_archived_idx`);
  await pgm.db.query(`DROP INDEX IF EXISTS teams_job_id_idx`);
  await pgm.db.query(`DROP INDEX IF EXISTS teams_team_type_idx`);
  await pgm.db.query(`
    ALTER TABLE teams
    DROP COLUMN IF EXISTS archived_at,
    DROP COLUMN IF EXISTS is_archived,
    DROP COLUMN IF EXISTS job_id,
    DROP COLUMN IF EXISTS team_type;
  `);
};
