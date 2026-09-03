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
    // media_assets currently has no project_id and no original_file_id.
    // There's no sensible backfill for project_id on existing rows (this
    // table was never scoped to a project before), so clear it out rather
    // than guess at ownership. CASCADE because market_media_assets (and
    // possibly others) hold FKs into media_assets.
    pgm.sql(`TRUNCATE TABLE media_assets CASCADE;`);

    pgm.addColumn("media_assets", {
        project_id: {
            type: "uuid",
            notNull: true,
            references: "projects",
        },
    });

    pgm.addColumn("media_assets", {
        original_file_id: {
            type: "uuid",
            notNull: true,
            references: "files",
        },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.sql(`TRUNCATE TABLE media_assets CASCADE;`);

    pgm.dropColumn("media_assets", "original_file_id");
    pgm.dropColumn("media_assets", "project_id");
};