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

    // Xendit recurring billing cycle identifier
    xendit_cycle_id: { 
      type: 'varchar(100)', 
      notNull: true,
      unique: true
    },
    xendit_plan_id: { 
      type: 'varchar(100)'
    },

    amount_php_cents: { 
      type: 'integer', 
      notNull: true 
    },

    status: { 
      type: 'varchar(50)', 
      notNull: true 
    },

    attempt_count: {
      type: 'integer',
      notNull: true,
      default: 0
    },

    billing_period_start: { 
      type: 'timestamp without time zone'
    },

    billing_period_end: { 
      type: 'timestamp without time zone'
    },

    paid_at: {
      type: 'timestamp without time zone'
    },

    failed_at: {
      type: 'timestamp without time zone'
    },

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

    subscription_id: { 
      type: 'uuid',
      notNull: true
    }
  });


  pgm.addConstraint(
    'subscription_invoices',
    'subscription_invoices_subscription_id_fkey',
    'FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON UPDATE CASCADE ON DELETE CASCADE'
  );
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('subscription_invoices', { ifExists: true });
};