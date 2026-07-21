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
  pgm.createTable('ratings', {
    rating_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    stars_out_of_five: { type: 'integer', notNull: true },
    feedback: { type: 'text', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    contract_id: { type: 'uuid', notNull: true },
    account_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('ratings', 'ratings_contract_id_fkey', 'FOREIGN KEY (contract_id) REFERENCES contracts(contract_id)');
  pgm.addConstraint('ratings', 'ratings_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('ratings', { ifExists: true });
};
