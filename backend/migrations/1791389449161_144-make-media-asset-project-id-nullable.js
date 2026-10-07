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
    pgm.alterColumn("media_assets", "project_id", {
        notNull: false,
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // Reverting to NOT NULL will fail if any rows have project_id = NULL by
    // this point. Clear them out first (or backfill) before rolling back.
    pgm.alterColumn("media_assets", "project_id", {
        notNull: true,
    });
};