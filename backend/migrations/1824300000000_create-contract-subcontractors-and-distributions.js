/**
 * Create contract subcontractors and subcontract fund distributions
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  // 1. Table for video editors / subcontractors assigned to a contract
  pgm.createTable('contract_subcontractors', {
    contract_id: {
      type: 'uuid',
      notNull: true,
      references: 'contracts',
      onDelete: 'CASCADE',
    },
    account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts',
      onDelete: 'CASCADE',
    },
    role_title: {
      type: 'varchar(120)',
      notNull: true,
      default: 'Video Editor',
    },
    agreed_credits: {
      type: 'integer',
      default: null,
    },
    notes: {
      type: 'text',
      default: null,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint('contract_subcontractors', 'contract_subcontractors_pkey', {
    primaryKey: ['contract_id', 'account_id'],
  });

  pgm.createIndex('contract_subcontractors', 'contract_id');
  pgm.createIndex('contract_subcontractors', 'account_id');

  // 2. Table for fund allocations / payouts from contract earnings to subcontractors
  pgm.createTable('contract_subcontract_distributions', {
    distribution_id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    contract_id: {
      type: 'uuid',
      notNull: true,
      references: 'contracts',
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
    notes: {
      type: 'text',
      default: null,
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

  pgm.createIndex('contract_subcontract_distributions', 'contract_id');
  pgm.createIndex('contract_subcontract_distributions', 'recipient_account_id');
  pgm.createIndex('contract_subcontract_distributions', 'distributed_by_account_id');
  pgm.createIndex('contract_subcontract_distributions', ['contract_id', 'created_at']);
};

exports.down = async (pgm) => {
  pgm.dropTable('contract_subcontract_distributions', { ifExists: true });
  pgm.dropTable('contract_subcontractors', { ifExists: true });
};
