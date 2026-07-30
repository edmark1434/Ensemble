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
  pgm.createTable('wallets', {
    wallet_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    type: { type: 'varchar(50)', notNull: true },
    status: { type: 'varchar(50)', notNull: true, default: 'active' },
    balance_credits: { type: 'integer', notNull: true, default: 0 },
    frozen_balance_credits: { type: 'integer', notNull: true, default: 0 },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('wallets', { ifExists: true });
};
