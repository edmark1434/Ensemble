/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('credit_transactions', {
    credit_transaction_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
      check: "type IN ('Fund Transfer', 'Escrow Hold', 'Escrow Release', 'Escrow Refund', 'Asset Purchase', 'Asset Refund', 'Fee')"
    },
    amount_credits: { type: 'integer', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    fee_transaction_id: { type: 'uuid' },
    source_wallet_id: { type: 'uuid', notNull: true },
    destination_wallet_id: { type: 'uuid', notNull: true },
    reference_table: { type: 'varchar(65)' },
    reference_id: { type: 'uuid'},
    related_dispute_id: { type: 'uuid' },
  });

  pgm.addConstraint('credit_transactions', 'credit_transactions_source_wallet_id_fkey', 'FOREIGN KEY (source_wallet_id) REFERENCES wallets(wallet_id)');
  pgm.addConstraint('credit_transactions', 'credit_transactions_destination_wallet_id_fkey', 'FOREIGN KEY (destination_wallet_id) REFERENCES wallets(wallet_id)');
  pgm.addConstraint('credit_transactions', 'credit_transactions_fee_transaction_id_fkey', 'FOREIGN KEY (fee_transaction_id) REFERENCES credit_transactions(credit_transaction_id)');
  pgm.createIndex('credit_transactions', 'related_dispute_id', {
    name: 'idx_credit_transactions_related_dispute',
  });
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('credit_transactions', { ifExists: true });
};
