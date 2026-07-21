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
  pgm.createTable('accounts', {
    account_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    display_name: { type: 'varchar(50)', notNull: true },
    handle: { type: 'varchar(50)' },
    type: { type: 'varchar(50)', notNull: true },
    tagline: { type: 'varchar(50)' },
    description: { type: 'text' },
    merit_score: { type: 'integer', notNull: true, default: 0 },
    status: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    avatar_file_id: { type: 'uuid' },
  });
    pgm.addConstraint('accounts', 'accounts_avatar_file_id_fkey', 'FOREIGN KEY (avatar_file_id) REFERENCES files(file_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('accounts', { ifExists: true });
};
