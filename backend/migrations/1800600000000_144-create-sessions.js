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
    pgm.createTable('sessions', {
        session_id: { type: 'bigserial', primaryKey: true },
        project_id: {
            type: 'uuid',
            notNull: true,
            references: 'projects',
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users',
        },
        socket_id: { type: 'text' },
        connected_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('now()'),
        },
        disconnected_at: { type: 'timestamp with time zone' },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('sessions', { ifExists: true });
};