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
  pgm.createTable('project_yjs_update', {
    yjs_update_id: { type: 'uuid', notNull: true },
    project_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('project_yjs_update', 'project_yjs_update_pkey', 'PRIMARY KEY (yjs_update_id, project_id)');
  pgm.addConstraint('project_yjs_update', 'project_yjs_update_yjs_update_id_fkey', 'FOREIGN KEY (yjs_update_id) REFERENCES yjs_updates(yjs_update_id)');
  pgm.addConstraint('project_yjs_update', 'project_yjs_update_project_id_fkey', 'FOREIGN KEY (project_id) REFERENCES projects(project_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('project_yjs_update', { ifExists: true });
};
