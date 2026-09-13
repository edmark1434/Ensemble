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
    pgm.createTable('block_members', {
        block_id: { type: 'uuid', notNull: true },
        user_id: { type: 'uuid', notNull: true },
        role: { type: 'varchar(50)', notNull: true },
        cursor_color: { type: 'varchar(50)', notNull: true },
        joined_at: {
            type: 'timestamp without time zone',
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP')
        },
        deleted_at: { type: 'timestamp without time zone' },
    });

    pgm.addConstraint('block_members', 'block_members_pkey', 'PRIMARY KEY (block_id, user_id)');
    pgm.addConstraint('block_members', 'block_members_block_id_fkey', 'FOREIGN KEY (block_id) REFERENCES blocks(block_id)');
    pgm.addConstraint('block_members', 'block_members_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('block_members', { ifExists: true });
};