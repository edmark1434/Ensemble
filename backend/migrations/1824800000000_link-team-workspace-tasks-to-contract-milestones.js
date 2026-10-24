/**
 * Migration: 1824800000000_link-team-workspace-tasks-to-contract-milestones.js
 * Links team workspace tasks to contract milestones for unified jobs & proposals,
 * and adds tasks JSONB storage to proposal_milestones and contract_milestones.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // 1. Add contract_milestone_id to team_workspace_tasks
  await pgm.db.query(`
    ALTER TABLE team_workspace_tasks
    ADD COLUMN IF NOT EXISTS contract_milestone_id UUID REFERENCES contract_milestones(contract_milestone_id) ON DELETE SET NULL;
  `);

  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS team_workspace_tasks_contract_milestone_idx 
    ON team_workspace_tasks (contract_milestone_id);
  `);

  // 2. Add tasks jsonb column to proposal_milestones
  await pgm.db.query(`
    ALTER TABLE proposal_milestones
    ADD COLUMN IF NOT EXISTS tasks JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);

  // 3. Add tasks jsonb column to contract_milestones
  await pgm.db.query(`
    ALTER TABLE contract_milestones
    ADD COLUMN IF NOT EXISTS tasks JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`
    DROP INDEX IF EXISTS team_workspace_tasks_contract_milestone_idx;
  `);

  await pgm.db.query(`
    ALTER TABLE team_workspace_tasks
    DROP COLUMN IF EXISTS contract_milestone_id;
  `);

  await pgm.db.query(`
    ALTER TABLE proposal_milestones
    DROP COLUMN IF EXISTS tasks;
  `);

  await pgm.db.query(`
    ALTER TABLE contract_milestones
    DROP COLUMN IF EXISTS tasks;
  `);
};
