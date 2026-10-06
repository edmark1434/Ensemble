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
    pgm.addColumns("projects", {
        thumbnail_file_id: {
            type: "uuid",
            notNull: false,
            references: "files(file_id)",
            onDelete: "SET NULL",
        },
        thumbnail_source_hash: {
            type: "text",
            notNull: false,
        },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropColumns("projects", ["thumbnail_file_id", "thumbnail_source_hash"]);
};