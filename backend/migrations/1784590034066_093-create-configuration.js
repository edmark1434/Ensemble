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
  pgm.createTable('configuration', {
    configuration_key: { type: 'varchar(50)', primaryKey: true, notNull: true },
    name: { type: 'varchar(50)', notNull: true },
    description: { type: 'text', notNull: true },
    current_value_literal: { type: 'varchar(50)', notNull: true },
    default_value_literal: { type: 'varchar(50)', notNull: true },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('configuration', { ifExists: true });
};
