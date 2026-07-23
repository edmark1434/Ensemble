/**
 * Dispute chats belong in MongoDB (inbox + messages).
 * dispute_chats already links dispute_id → chat_id; chat_id must hold a Mongo ObjectId string.
 * dispute_messages was a mistaken Postgres duplicate of that thread — drop it.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.dropIndex('dispute_messages', 'dispute_id', {
    name: 'idx_dispute_messages_dispute',
    ifExists: true,
  });
  pgm.dropTable('dispute_messages', { ifExists: true });

  // ObjectId hex strings are not UUIDs — store as text.
  pgm.alterColumn('dispute_chats', 'chat_id', { type: 'text', notNull: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  // Cannot safely cast Mongo ObjectIds back to uuid — clear links first.
  pgm.sql(`DELETE FROM dispute_chats`);
  pgm.sql(`
    ALTER TABLE dispute_chats
    ALTER COLUMN chat_id TYPE uuid
    USING '00000000-0000-0000-0000-000000000000'::uuid
  `);

  pgm.createTable('dispute_messages', {
    message_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    dispute_id: { type: 'uuid', notNull: true },
    author_account_id: { type: 'uuid' },
    author_type: { type: 'varchar(20)', notNull: true, default: 'staff' },
    author_name: { type: 'varchar(100)' },
    body: { type: 'text', notNull: true },
    is_internal: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'dispute_messages',
    'dispute_messages_dispute_id_fkey',
    'FOREIGN KEY (dispute_id) REFERENCES disputes(dispute_id) ON DELETE CASCADE'
  );
  pgm.addConstraint(
    'dispute_messages',
    'dispute_messages_author_account_id_fkey',
    'FOREIGN KEY (author_account_id) REFERENCES accounts(account_id)'
  );
  pgm.createIndex('dispute_messages', 'dispute_id', { name: 'idx_dispute_messages_dispute' });
};
