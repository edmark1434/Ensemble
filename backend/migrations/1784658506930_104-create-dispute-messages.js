/**
 * Dispute discussion thread, mirrors ticket_messages so support moderators
 * can chat about a dispute before resolving it.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
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

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropIndex('dispute_messages', 'dispute_id', { name: 'idx_dispute_messages_dispute', ifExists: true });
  pgm.dropTable('dispute_messages', { ifExists: true });
};
