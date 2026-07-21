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
  pgm.createTable('pardons', {
    pardon_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    account_id: { type: 'uuid', notNull: true },
    staff_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('pardons', 'pardons_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('pardons', 'pardons_staff_id_fkey', 'FOREIGN KEY (staff_id) REFERENCES staff(staff_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('pardons', { ifExists: true });
};

