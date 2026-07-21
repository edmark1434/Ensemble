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
  pgm.createTable('payments', {
    id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    user_id: { type: 'uuid', notNull: true },
    reference_id: { type: 'varchar(255)', notNull: true, unique: true },
    payment_request_id: { type: 'varchar(255)' },
    payment_id: { type: 'varchar(255)', unique: true },
    payment_session_id: { type: 'varchar(255)' },
    payment_token_id: { type: 'varchar(255)' },
    channel_code: { type: 'varchar(20)' },
    amount: { type: 'numeric(12,2)', notNull: true },
    currency: { type: 'varchar(10)', default: 'PHP' },
    status: { type: 'varchar(20)', default: 'PENDING' },
    credits: { type: 'integer', default: 0 },
    payment_type: { type: 'varchar(64)' },
    description: { type: 'text' },
    processed_at: { type: 'timestamp with time zone' },
    customer_id: { type: 'varchar(255)' },
    created_at: { type: 'timestamp with time zone', default: pgm.func('now()') },
    updated_at: { type: 'timestamp with time zone', default: pgm.func('now()') },
    redirect_url: { type: 'varchar(255)' },
    expired_at: { type: 'timestamp with time zone' },
  });

  pgm.addConstraint('payments', 'payments_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('payments', { ifExists: true });
};

