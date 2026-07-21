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
  pgm.createTable('payment_methods', {
    id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    user_id: { type: 'uuid', notNull: true },
    payment_token_id: { type: 'varchar(255)', notNull: true, unique: true },
    channel_code: { type: 'varchar(20)', notNull: true },
    type: { type: 'varchar(100)', notNull: true },
    status: { type: 'varchar(20)', default: 'ACTIVE' },
    is_default: { type: 'boolean', default: false },
    display_name: { type: 'varchar(100)' },
    card_brand: { type: 'varchar(50)' },
    masked_card_number: { type: 'varchar(100)' },
    card_exp_month: { type: 'varchar(5)' },
    card_exp_year: { type: 'varchar(5)' },
    customer_reference_id: { type: 'varchar(100)' },
    created_at: { type: 'timestamp without time zone', default: pgm.func('now()') },
    updated_at: { type: 'timestamp without time zone', default: pgm.func('now()') },
    fingerprint: { type: 'varchar(64)' },
  });

  pgm.addConstraint('payment_methods', 'payment_methods_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE');
  pgm.addConstraint('payment_methods', 'fk_cust_ref_id', 'FOREIGN KEY (customer_reference_id) REFERENCES payments(reference_id) ON UPDATE CASCADE ON DELETE CASCADE');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('payment_methods', { ifExists: true });
};
