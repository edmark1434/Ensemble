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
  pgm.createTable('badges', {
    badge_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    name: { type: 'varchar(50)', notNull: true },
    description: { type: 'text', notNull: true },
    is_secret: { type: 'boolean', notNull: true, default: false },
    trigger_event_code: { type: 'varchar(50)', notNull: true },
    condition_type: { type: 'varchar(50)', notNull: true },
    condition_value: { type: 'integer', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    badge_category_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('badges', 'badges_badge_category_id_fkey', 'FOREIGN KEY (badge_category_id) REFERENCES badge_categories(badge_category_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('badges', { ifExists: true });
};
