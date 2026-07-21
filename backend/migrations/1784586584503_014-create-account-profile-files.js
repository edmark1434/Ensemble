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
  pgm.createTable('account_profile_files', {
    acc_prof_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    file_id: { type: 'uuid' },
    account_id: { type: 'uuid' },
  });

  pgm.addConstraint('account_profile_files', 'account_profile_files_file_id_fkey', 'FOREIGN KEY (file_id) REFERENCES files(file_id) ON UPDATE CASCADE ON DELETE CASCADE');
  pgm.addConstraint('account_profile_files', 'account_profile_files_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON UPDATE CASCADE ON DELETE CASCADE');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('account_profile_files', { ifExists: true });
};

