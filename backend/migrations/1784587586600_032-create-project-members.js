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
  pgm.createTable('project_members', {
    project_id: { type: 'uuid', notNull: true },
    user_id: { type: 'uuid', notNull: true },
    role: { type: 'varchar(50)', notNull: true },
    cursor_color: { type: 'varchar(50)', notNull: true },
    joined_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
  });

  pgm.addConstraint('project_members', 'project_members_pkey', 'PRIMARY KEY (project_id, user_id)');
  pgm.addConstraint('project_members', 'project_members_project_id_fkey', 'FOREIGN KEY (project_id) REFERENCES projects(project_id)');
  pgm.addConstraint('project_members', 'project_members_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('project_members', { ifExists: true });
};
