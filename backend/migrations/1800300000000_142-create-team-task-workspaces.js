/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('team_contract_workspaces', {
    workspace_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    team_id: { type: 'uuid', notNull: true, references: 'teams', onDelete: 'CASCADE' },
    contract_id: { type: 'uuid', notNull: true, references: 'contracts', onDelete: 'CASCADE' },
    created_by_account_id: { type: 'uuid', notNull: true, references: 'accounts', onDelete: 'RESTRICT' },
    created_at: { type: 'timestamp without time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp without time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('team_contract_workspaces', 'team_contract_workspaces_team_contract_unique', {
    unique: ['team_id', 'contract_id'],
  });
  pgm.createIndex('team_contract_workspaces', ['team_id', 'updated_at']);
  pgm.createIndex('team_contract_workspaces', 'contract_id');

  pgm.createTable('team_workspace_members', {
    workspace_id: { type: 'uuid', notNull: true, references: 'team_contract_workspaces', onDelete: 'CASCADE' },
    account_id: { type: 'uuid', notNull: true, references: 'accounts', onDelete: 'CASCADE' },
    added_by_account_id: { type: 'uuid', notNull: true, references: 'accounts', onDelete: 'RESTRICT' },
    joined_at: { type: 'timestamp without time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('team_workspace_members', 'team_workspace_members_pkey', {
    primaryKey: ['workspace_id', 'account_id'],
  });
  pgm.createIndex('team_workspace_members', 'account_id');

  pgm.createTable('team_workspace_tasks', {
    task_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    workspace_id: { type: 'uuid', notNull: true, references: 'team_contract_workspaces', onDelete: 'CASCADE' },
    title: { type: 'varchar(160)', notNull: true },
    description: { type: 'text' },
    status: { type: 'varchar(30)', notNull: true, default: 'todo' },
    priority: { type: 'varchar(20)', notNull: true, default: 'normal' },
    starts_at: { type: 'timestamp with time zone' },
    due_at: { type: 'timestamp with time zone' },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_by_account_id: { type: 'uuid', notNull: true, references: 'accounts', onDelete: 'RESTRICT' },
    completed_at: { type: 'timestamp with time zone' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    deleted_at: { type: 'timestamp with time zone' },
  });
  pgm.addConstraint('team_workspace_tasks', 'team_workspace_tasks_status_check', {
    check: "status IN ('todo', 'in_progress', 'in_review', 'completed')",
  });
  pgm.addConstraint('team_workspace_tasks', 'team_workspace_tasks_priority_check', {
    check: "priority IN ('low', 'normal', 'high', 'urgent')",
  });
  pgm.addConstraint('team_workspace_tasks', 'team_workspace_tasks_dates_check', {
    check: 'starts_at IS NULL OR due_at IS NULL OR due_at >= starts_at',
  });
  pgm.createIndex('team_workspace_tasks', ['workspace_id', 'status', 'sort_order']);
  pgm.createIndex('team_workspace_tasks', ['workspace_id', 'due_at']);

  pgm.createTable('team_workspace_task_assignees', {
    task_id: { type: 'uuid', notNull: true, references: 'team_workspace_tasks', onDelete: 'CASCADE' },
    account_id: { type: 'uuid', notNull: true, references: 'accounts', onDelete: 'CASCADE' },
    assigned_by_account_id: { type: 'uuid', notNull: true, references: 'accounts', onDelete: 'RESTRICT' },
    assigned_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('team_workspace_task_assignees', 'team_workspace_task_assignees_pkey', {
    primaryKey: ['task_id', 'account_id'],
  });
  pgm.createIndex('team_workspace_task_assignees', 'account_id');

  pgm.createTable('team_workspace_activity', {
    activity_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    workspace_id: { type: 'uuid', notNull: true, references: 'team_contract_workspaces', onDelete: 'CASCADE' },
    task_id: { type: 'uuid', references: 'team_workspace_tasks', onDelete: 'SET NULL' },
    actor_account_id: { type: 'uuid', notNull: true, references: 'accounts', onDelete: 'RESTRICT' },
    action: { type: 'varchar(50)', notNull: true },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('team_workspace_activity', ['workspace_id', 'created_at']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('team_workspace_activity', { ifExists: true });
  pgm.dropTable('team_workspace_task_assignees', { ifExists: true });
  pgm.dropTable('team_workspace_tasks', { ifExists: true });
  pgm.dropTable('team_workspace_members', { ifExists: true });
  pgm.dropTable('team_contract_workspaces', { ifExists: true });
};
