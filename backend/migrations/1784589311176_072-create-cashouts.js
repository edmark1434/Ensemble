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
  pgm.createTable('cashouts', {
    cashout_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    xendit_disbursement_id: { type: 'varchar(50)', notNull: true },
    xendit_channel_code: { type: 'varchar(50)', notNull: true },
    account_no: { type: 'varchar(50)', notNull: true },
    account_name: { type: 'varchar(50)' },
    amount_credits: { type: 'integer', notNull: true },
    fee_php_cents: { type: 'integer', notNull: true },
    net_amount_php_cents: { type: 'integer', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    user_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('cashouts', 'cashouts_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('cashouts', { ifExists: true });
};

