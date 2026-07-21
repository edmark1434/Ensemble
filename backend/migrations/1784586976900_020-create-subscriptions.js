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
      type: 'varchar(255)', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    xendit_plan_id: { type: 'varchar(50)' },
    status: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    current_period_start: { type: 'timestamp without time zone' },
    current_period_end: { type: 'timestamp without time zone' },
    trial_ends_at: { type: 'timestamp without time zone' },
    canceled_at: { type: 'timestamp without time zone' },
    plan_id: { type: 'uuid', notNull: true },
    user_id: { type: 'uuid', notNull: true },
    trial_starts_at: { type: 'timestamp without time zone' },
  });

  pgm.addConstraint('subscriptions', 'subscriptions_plan_id_fkey', 'FOREIGN KEY (plan_id) REFERENCES plans(plan_id)');
  pgm.addConstraint('subscriptions', 'subscriptions_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('subscriptions', { ifExists: true });
};
