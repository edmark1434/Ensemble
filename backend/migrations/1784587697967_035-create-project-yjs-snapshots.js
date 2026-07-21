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
  pgm.createTable('project_yjs_snapshots', {
    yjs_snapshot_id: { type: 'uuid', notNull: true },
    project_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('project_yjs_snapshots', 'project_yjs_snapshots_pkey', 'PRIMARY KEY (yjs_snapshot_id, project_id)');
  pgm.addConstraint('project_yjs_snapshots', 'project_yjs_snapshots_yjs_snapshot_id_fkey', 'FOREIGN KEY (yjs_snapshot_id) REFERENCES yjs_snapshots(yjs_snapshot_id)');
  pgm.addConstraint('project_yjs_snapshots', 'project_yjs_snapshots_project_id_fkey', 'FOREIGN KEY (project_id) REFERENCES projects(project_id)');
};
/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('project_yjs_snapshots', { ifExists: true });
};