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
  pgm.createTable('users', {
    user_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    firebase_user_uuid: { type: 'varchar(50)', unique: true },
    first_name: { type: 'varchar(50)', notNull: true },
    last_name: { type: 'varchar(50)', notNull: true },
    email_address: { type: 'varchar(50)', notNull: true, unique: true },
    password_hash: { type: 'text' },
    account_id: { type: 'uuid', notNull: true },
    middle_name: { type: 'varchar(64)' },
    suffix: { type: 'varchar(20)' },
    birth_date: { type: 'date' },
    country: { type: 'varchar(64)' },
    is_email_verified: { type: 'boolean', default: false },
    customer_id: { type: 'varchar(255)' },
    zip_code: { type: 'integer' },
    address: { type: 'text' },
    completed_onboarding: { type: 'varchar(64)' },
  });

  pgm.addConstraint('users', 'users_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON UPDATE CASCADE ON DELETE CASCADE');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('users', { ifExists: true });
};
