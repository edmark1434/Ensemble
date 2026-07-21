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
  pgm.createTable('block_yjs_updates', {
    yjs_update_id: { type: 'uuid', notNull: true },
    block_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('block_yjs_updates', 'block_yjs_updates_pkey', 'PRIMARY KEY (yjs_update_id, block_id)');
  pgm.addConstraint('block_yjs_updates', 'block_yjs_updates_block_id_fkey', 'FOREIGN KEY (block_id) REFERENCES blocks(block_id)');
  pgm.addConstraint('block_yjs_updates', 'block_yjs_updates_yjs_update_id_fkey', 'FOREIGN KEY (yjs_update_id) REFERENCES yjs_updates(yjs_update_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('block_yjs_updates', { ifExists: true });
};