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
    pgm.renameTable("project_yjs_update", "project_yjs_updates");
    pgm.renameConstraint("project_yjs_updates", "project_yjs_update_pkey", "project_yjs_updates_pkey");
    pgm.renameConstraint("project_yjs_updates", "project_yjs_update_yjs_update_id_fkey", "project_yjs_updates_yjs_update_id_fkey");
    pgm.renameConstraint("project_yjs_updates", "project_yjs_update_project_id_fkey", "project_yjs_updates_project_id_fkey");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.renameTable("project_yjs_updates", "project_yjs_update");
    pgm.renameConstraint("project_yjs_updates", "project_yjs_updates_pkey", "project_yjs_update_pkey");
    pgm.renameConstraint("project_yjs_updates", "project_yjs_updates_yjs_update_id_fkey", "project_yjs_update_yjs_update_id_fkey");
    pgm.renameConstraint("project_yjs_updates", "project_yjs_updates_project_id_fkey", "project_yjs_update_project_id_fkey");
};