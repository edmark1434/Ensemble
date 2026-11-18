/**
 * Editor saves: one row per explicit save, coupling the project document snapshot with the
 * snapshot of every scene (block) document taken in the same save. Periodic checkpoints keep
 * writing plain yjs_snapshots rows; only explicit saves are listed as versions.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.createTable('project_saves', {
    project_save_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    yjs_snapshot_id: { type: 'bigint', notNull: true, references: 'yjs_snapshots' },
    created_by_user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });
  pgm.createIndex('project_saves', ['project_id', 'created_at']);

  pgm.createTable('project_save_blocks', {
    project_save_id: { type: 'uuid', notNull: true, references: 'project_saves', onDelete: 'CASCADE' },
    block_id: { type: 'uuid', notNull: true, references: 'blocks', onDelete: 'CASCADE' },
    yjs_snapshot_id: { type: 'bigint', notNull: true, references: 'yjs_snapshots' },
  });
  pgm.addConstraint('project_save_blocks', 'project_save_blocks_pkey', {
    primaryKey: ['project_save_id', 'block_id'],
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropTable('project_save_blocks', { ifExists: true });
  pgm.dropTable('project_saves', { ifExists: true });
};
