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
  pgm.createTable('user_platform_purpose', {
    user_plpu_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    plpu_id: { type: 'uuid' },
    user_id: { type: 'uuid' },
  });

  pgm.addConstraint('user_platform_purpose', 'user_platform_purpose_plpu_id_fkey', 'FOREIGN KEY (plpu_id) REFERENCES platform_purpose(plpu_id) ON UPDATE CASCADE ON DELETE CASCADE');
  pgm.addConstraint('user_platform_purpose', 'user_platform_purpose_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('user_platform_purpose', { ifExists: true });
};
