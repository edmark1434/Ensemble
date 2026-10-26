/**
 * Migration to link video projects to team contract workspaces.
 * Enables team workspace members to collaborate on video projects linked to contracts.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Add primary project_id to team_contract_workspaces
  pgm.addColumn('team_contract_workspaces', {
    project_id: {
      type: 'uuid',
      notNull: false,
      references: 'projects(project_id)',
      onDelete: 'SET NULL',
    },
  });

  // 2. Create team_workspace_projects junction table to support multiple video projects if needed
  pgm.createTable('team_workspace_projects', {
    workspace_project_id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    workspace_id: {
      type: 'uuid',
      notNull: true,
      references: 'team_contract_workspaces(workspace_id)',
      onDelete: 'CASCADE',
    },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects(project_id)',
      onDelete: 'CASCADE',
    },
    linked_by_account_id: {
      type: 'uuid',
      references: 'accounts(account_id)',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint('team_workspace_projects', 'team_workspace_projects_unique', {
    unique: ['workspace_id', 'project_id'],
  });

  pgm.createIndex('team_workspace_projects', 'workspace_id');
  pgm.createIndex('team_workspace_projects', 'project_id');

  // 3. Backfill any existing_project_id from jobs linked to workspaces
  pgm.sql(`
    INSERT INTO team_workspace_projects (workspace_id, project_id, linked_by_account_id, created_at)
    SELECT DISTINCT tcw.workspace_id, j.existing_project_id, tcw.created_by_account_id, NOW()
      FROM team_contract_workspaces tcw
      JOIN contracts c ON c.contract_id = tcw.contract_id
      JOIN job_contracts jc ON jc.contract_id = c.contract_id
      JOIN proposals p ON p.proposal_id = jc.proposal_id
      JOIN jobs j ON j.job_id = p.job_id
     WHERE j.existing_project_id IS NOT NULL
    ON CONFLICT (workspace_id, project_id) DO NOTHING;

    UPDATE team_contract_workspaces tcw
       SET project_id = j.existing_project_id
      FROM contracts c
      JOIN job_contracts jc ON jc.contract_id = c.contract_id
      JOIN proposals p ON p.proposal_id = jc.proposal_id
      JOIN jobs j ON j.job_id = p.job_id
     WHERE tcw.contract_id = c.contract_id
       AND j.existing_project_id IS NOT NULL
       AND tcw.project_id IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('team_workspace_projects', { ifExists: true });
  pgm.dropColumn('team_contract_workspaces', 'project_id', { ifExists: true });
};
