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
  pgm.createTable('block_yjs_snapshot', {
    yjs_snapshot_id: { type: 'uuid', notNull: true },
    block_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('block_yjs_snapshot', 'block_yjs_snapshot_pkey', 'PRIMARY KEY (yjs_snapshot_id, block_id)');
  pgm.addConstraint('block_yjs_snapshot', 'block_yjs_snapshot_block_id_fkey', 'FOREIGN KEY (block_id) REFERENCES blocks(block_id)');
  pgm.addConstraint('block_yjs_snapshot', 'block_yjs_snapshot_yjs_snapshot_id_fkey', 'FOREIGN KEY (yjs_snapshot_id) REFERENCES yjs_snapshots(yjs_snapshot_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('block_yjs_snapshot', { ifExists: true });
};