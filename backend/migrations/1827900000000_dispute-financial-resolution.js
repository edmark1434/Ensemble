/**
 * Dispute desk financial resolution:
 * - Link compensating credit_transactions to the original via reverses_credit_transaction_id
 * - Persist one-shot financial outcome fields on disputes
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  pgm.addColumns('credit_transactions', {
    reverses_credit_transaction_id: {
      type: 'uuid',
      references: 'credit_transactions',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('credit_transactions', 'reverses_credit_transaction_id', {
    name: 'credit_transactions_reverses_txn_uidx',
    unique: true,
    where:
      "reverses_credit_transaction_id IS NOT NULL AND status IN ('Completed', 'Pending')",
  });

  pgm.addColumns('disputes', {
    financial_resolution_at: { type: 'timestamptz' },
    financial_resolution_kind: { type: 'varchar(32)' },
    financial_resolution_staff_id: {
      type: 'uuid',
      references: 'staff',
      onDelete: 'SET NULL',
    },
    financial_client_credits: { type: 'integer', notNull: true, default: 0 },
    financial_freelancer_credits: { type: 'integer', notNull: true, default: 0 },
    financial_reversed_transaction_id: {
      type: 'uuid',
      references: 'credit_transactions',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('disputes', 'financial_resolution_staff_id', {
    name: 'disputes_financial_resolution_staff_idx',
  });
};

exports.down = async (pgm) => {
  pgm.dropIndex('disputes', 'financial_resolution_staff_id', {
    name: 'disputes_financial_resolution_staff_idx',
    ifExists: true,
  });
  pgm.dropColumns('disputes', [
    'financial_resolution_at',
    'financial_resolution_kind',
    'financial_resolution_staff_id',
    'financial_client_credits',
    'financial_freelancer_credits',
    'financial_reversed_transaction_id',
  ]);
  pgm.dropIndex('credit_transactions', 'reverses_credit_transaction_id', {
    name: 'credit_transactions_reverses_txn_uidx',
    ifExists: true,
  });
  pgm.dropColumns('credit_transactions', ['reverses_credit_transaction_id']);
};
