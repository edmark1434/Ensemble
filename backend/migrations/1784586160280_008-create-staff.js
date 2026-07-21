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
  pgm.createTable('staff', {
    staff_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    firebase_staff_uuid: { type: 'varchar(50)', notNull: true, unique: true },
    first_name: { type: 'varchar(50)', notNull: true },
    last_name: { type: 'varchar(50)', notNull: true },
    role: { type: 'varchar(50)', notNull: true },
    email_address: { type: 'varchar(50)', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    account_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('staff', 'staff_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('staff', { ifExists: true });
};

