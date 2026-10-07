/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumn('team_contract_workspaces', {
    project_lead_account_id: {
      type: 'uuid',
      references: 'accounts',
      onDelete: 'SET NULL',
    },
  });

  pgm.sql(`UPDATE team_contract_workspaces SET project_lead_account_id = created_by_account_id WHERE project_lead_account_id IS NULL`);

  pgm.createIndex('team_contract_workspaces', 'project_lead_account_id');

  pgm.createTable('team_contract_distributions', {
    distribution_id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    workspace_id: {
      type: 'uuid',
      notNull: true,
      references: 'team_contract_workspaces',
      onDelete: 'CASCADE',
    },
    contract_id: {
      type: 'uuid',
      notNull: true,
      references: 'contracts',
      onDelete: 'CASCADE',
    },
    team_id: {
      type: 'uuid',
      notNull: true,
      references: 'teams',
      onDelete: 'CASCADE',
    },
    distributed_by_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts',
      onDelete: 'RESTRICT',
    },
    recipient_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts',
      onDelete: 'RESTRICT',
    },
    amount_credits: {
      type: 'integer',
      notNull: true,
      check: 'amount_credits > 0',
    },
    credit_transaction_id: {
      type: 'uuid',
      references: 'credit_transactions',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('team_contract_distributions', ['workspace_id', 'created_at']);
  pgm.createIndex('team_contract_distributions', 'contract_id');
  pgm.createIndex('team_contract_distributions', 'recipient_account_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('team_contract_distributions', { ifExists: true });
  pgm.dropColumn('team_contract_workspaces', 'project_lead_account_id', { ifExists: true });
};
