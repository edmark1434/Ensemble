/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('terms_of_service', {
    terms_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    terms_title: { type: 'varchar(255)', notNull: true },
    terms_description: { type: 'text', notNull: true },
    terms_type: { type: 'varchar(50)', notNull: true }, // 'jobs' or 'gigs'
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    account_id: {
      type: 'uuid',
      references: '"accounts"(account_id)',
      onDelete: 'CASCADE',
    },
    is_default: {
      type: 'boolean',
      default: false
    }
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('terms_of_service', { ifExists: true });
};
