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
  pgm.createTable('surveys', {
    survey_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    survey_name: { type: 'varchar(200)', notNull: true },
    description: { type: 'text' },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp without time zone', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp without time zone', default: pgm.func('CURRENT_TIMESTAMP') },
  });
};
/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('surveys', { ifExists: true });
};
