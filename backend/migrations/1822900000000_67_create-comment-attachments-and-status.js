/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

const COMMENT_TABLES = ['project_comments', 'block_comments'];

// same shape as chat_message_attachment: (parent_id, file_id) PK, index, created_at
const ATTACHMENT_TABLES = [
    { table: 'project_comment_attachments', parent: 'project_comments', key: 'project_comment_id' },
    { table: 'project_reply_attachments', parent: 'project_replies', key: 'project_reply_id' },
    { table: 'block_comment_attachments', parent: 'block_comments', key: 'block_comment_id' },
    { table: 'block_reply_attachments', parent: 'block_replies', key: 'block_reply_id' },
];

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    // comment status (threads only, replies don't have one)
    for (const table of COMMENT_TABLES) {
        pgm.addColumns(table, {
            status: { type: 'varchar(50)', notNull: true, default: 'open' },
            resolved_at: { type: 'timestamp without time zone' },
            resolved_by_user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
        });
        pgm.addConstraint(table, `${table}_status_check`, "CHECK (status IN ('open', 'resolved'))");
    }

    for (const { table, parent, key } of ATTACHMENT_TABLES) {
        pgm.createTable(table, {
            [key]: { type: 'uuid', notNull: true, references: parent, onDelete: 'CASCADE' },
            file_id: { type: 'uuid', notNull: true, references: 'files', onDelete: 'CASCADE' },
            index: { type: 'int', notNull: true, default: 0 },
            created_at: {
                type: 'timestamp without time zone',
                notNull: true,
                default: pgm.func('CURRENT_TIMESTAMP')
            },
        });
        pgm.addConstraint(table, `${table}_pkey`, `PRIMARY KEY (${key}, file_id)`);
        pgm.createIndex(table, 'file_id');
    }
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    for (const { table } of ATTACHMENT_TABLES) {
        pgm.dropTable(table, { ifExists: true });
    }
    for (const table of COMMENT_TABLES) {
        pgm.dropConstraint(table, `${table}_status_check`, { ifExists: true });
        pgm.dropColumns(table, ['status', 'resolved_at', 'resolved_by_user_id'], { ifExists: true });
    }
};