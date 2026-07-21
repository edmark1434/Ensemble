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
  pgm.createTable('user_tags', {
    user_id: { type: 'uuid', notNull: true },
    tag_id: { type: 'uuid', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    proficiency: { type: 'varchar(64)', notNull: true },
    years: { type: 'integer' },
  });

  pgm.addConstraint('user_tags', 'user_tags_pkey', 'PRIMARY KEY (user_id, tag_id)');
  pgm.addConstraint('user_tags', 'user_tags_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id)');
  pgm.addConstraint('user_tags', 'user_tags_tag_id_fkey', 'FOREIGN KEY (tag_id) REFERENCES tags(tag_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('user_tags', { ifExists: true });
};
