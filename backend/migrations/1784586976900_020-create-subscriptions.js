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
  pgm.createTable('subscriptions', {
    subscription_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },

    // Xendit data (NULL for FREE plan)
    xendit_plan_id: { 
      type: 'varchar(100)',
      unique: true
    },

    reference_id: {
      type: 'varchar(255)',
      unique: true
    },

    payment_token_id: {
      type: 'varchar(100)'
    },


    // Subscription status
    status: { 
      type: 'varchar(50)', 
      notNull: true
    },


    // Relations
    plan_id: { 
      type: 'uuid', 
      notNull: true 
    },

    user_id: { 
      type: 'uuid', 
      notNull: true 
    },


    // Trial information
    trial_starts_at: { 
      type: 'timestamp without time zone'
    },

    trial_ends_at: { 
      type: 'timestamp without time zone'
    },


    // Paid subscription period
    current_period_start: { 
      type: 'timestamp without time zone'
    },

    current_period_end: { 
      type: 'timestamp without time zone'
    },


    // Next billing date
    next_billing_at: {
      type: 'timestamp without time zone'
    },


    // Cancellation
    cancel_at_period_end: {
      type: 'boolean',
      notNull: true,
      default: false
    },

    canceled_at: { 
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
    }
  });


  pgm.addConstraint(
    'subscriptions',
    'subscriptions_plan_id_fkey',
    'FOREIGN KEY (plan_id) REFERENCES plans(plan_id)'
  );

  pgm.addConstraint(
    'subscriptions',
    'subscriptions_user_id_fkey',
    'FOREIGN KEY (user_id) REFERENCES users(user_id)'
  );
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('subscriptions', { ifExists: true });
};