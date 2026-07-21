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
  pgm.createTable('subscription_invoices', {
    subscription_invoice_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    xendit_invoice_id: { type: 'varchar(50)', notNull: true },
    amount_php_cents: { type: 'integer', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    billing_period_start: { type: 'timestamp without time zone', notNull: true },
    billing_period_end: { type: 'timestamp without time zone', notNull: true },
    subscription_id: { type: 'varchar(255)', notNull: true },
  });

  pgm.addConstraint('subscription_invoices', 'subscription_invoices_subscription_id_fkey', 'FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON UPDATE CASCADE ON DELETE CASCADE');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('subscription_invoices', { ifExists: true });
};
