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
    pgm.createTable('session_activities', {
        session_activity_id: { type: 'bigserial', primaryKey: true },
        session_id: {
            type: 'bigint',
            notNull: true,
            references: 'sessions',
        },
        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('now()'),
        },
        type: { type: 'varchar' },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('session_activities', { ifExists: true });
};