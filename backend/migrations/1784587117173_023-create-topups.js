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
  pgm.createTable('topups', {
    topup_id: { type: 'varchar(255)', primaryKey: true, notNull: true },
    xendit_payment_id: { type: 'varchar(50)', unique: true },
    xendit_channel_code: { type: 'varchar(50)' },
    amount_php_cents: { type: 'integer', notNull: true },
    credits_granted: { type: 'integer', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    user_id: { type: 'uuid', notNull: true },
    updated_at: { type: 'timestamp without time zone' },
  });

  pgm.addConstraint('topups', 'fk_topups', 'FOREIGN KEY (topup_id) REFERENCES payments(reference_id) ON UPDATE CASCADE ON DELETE CASCADE');
  pgm.addConstraint('topups', 'fk_topups_payment', 'FOREIGN KEY (xendit_payment_id) REFERENCES payments(payment_id) ON UPDATE CASCADE ON DELETE CASCADE');
  pgm.addConstraint('topups', 'fk_topups_user', 'FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('topups', { ifExists: true });
};
