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
    // Drop the broken table
    pgm.dropTable('block_replies', { ifExists: true, cascade: true });

    // ---- Block comments ----
    pgm.createTable('block_comments', {
        block_comment_id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        block_id: {
            type: 'uuid',
            notNull: true,
            references: 'blocks(block_id)',
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(user_id)',
        },
        comment: { type: 'text', notNull: true },
        created_at: {
            type: 'timestamp without time zone',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp without time zone',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        deleted_at: { type: 'timestamp without time zone' },
    });
    pgm.createIndex('block_comments', 'block_id');
    pgm.createIndex('block_comments', 'user_id');

    // ---- Block replies ----
    pgm.createTable('block_replies', {
        block_reply_id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        block_comment_id: {
            type: 'uuid',
            notNull: true,
            references: 'block_comments(block_comment_id)',
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(user_id)',
        },
        reply: { type: 'text', notNull: true },
        created_at: {
            type: 'timestamp without time zone',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp without time zone',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        deleted_at: { type: 'timestamp without time zone' },
    });
    pgm.createIndex('block_replies', 'block_comment_id');
    pgm.createIndex('block_replies', 'user_id');

    // ---- Project comments ----
    pgm.createTable('project_comments', {
        project_comment_id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        project_id: {
            type: 'uuid',
            notNull: true,
            references: 'projects(project_id)',
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(user_id)',
        },
        comment: { type: 'text', notNull: true },
        created_at: {
            type: 'timestamp without time zone',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp without time zone',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        deleted_at: { type: 'timestamp without time zone' },
    });
    pgm.createIndex('project_comments', 'project_id');
    pgm.createIndex('project_comments', 'user_id');

    // ---- Project replies ----
    pgm.createTable('project_replies', {
        project_reply_id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        project_comment_id: {
            type: 'uuid',
            notNull: true,
            references: 'project_comments(project_comment_id)',
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(user_id)',
        },
        reply: { type: 'text', notNull: true },
        created_at: {
            type: 'timestamp without time zone',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp without time zone',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        deleted_at: { type: 'timestamp without time zone' },
    });
    pgm.createIndex('project_replies', 'project_comment_id');
    pgm.createIndex('project_replies', 'user_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // Children first, then parents
    pgm.dropTable('project_replies');
    pgm.dropTable('project_comments');
    pgm.dropTable('block_replies');
    pgm.dropTable('block_comments');

    // NOTE: the old (broken) block_replies table is not recreated here,
    // since I don't know its original definition. Add it back if you
    // need a fully reversible migration.
};