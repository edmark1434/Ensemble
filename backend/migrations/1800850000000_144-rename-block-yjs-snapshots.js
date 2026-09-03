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
    pgm.renameTable("block_yjs_snapshot", "block_yjs_snapshots");
    pgm.renameConstraint("block_yjs_snapshots", "block_yjs_snapshot_pkey", "block_yjs_snapshots_pkey");
    pgm.renameConstraint("block_yjs_snapshots", "block_yjs_snapshot_yjs_snapshot_id_fkey", "block_yjs_snapshots_yjs_snapshot_id_fkey");
    pgm.renameConstraint("block_yjs_snapshots", "block_yjs_snapshot_block_id_fkey", "block_yjs_snapshots_block_id_fkey");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.renameTable("block_yjs_snapshots", "block_yjs_snapshot");
    pgm.renameConstraint("block_yjs_snapshot", "block_yjs_snapshots_pkey", "block_yjs_snapshot_pkey");
    pgm.renameConstraint("block_yjs_snapshot", "block_yjs_snapshots_yjs_snapshot_id_fkey", "block_yjs_snapshot_yjs_snapshot_id_fkey");
    pgm.renameConstraint("block_yjs_snapshot", "block_yjs_snapshots_block_id_fkey", "block_yjs_snapshot_block_id_fkey");
};