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
  pgm.createTable('platform_settings', {
    setting_key: { type: 'varchar(100)', primaryKey: true, notNull: true },
    setting_value: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_by_staff_id: { type: 'uuid' },
  });

  pgm.addConstraint(
    'platform_settings',
    'platform_settings_updated_by_staff_id_fkey',
    'FOREIGN KEY (updated_by_staff_id) REFERENCES staff(staff_id)'
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('platform_settings', { ifExists: true });
};
