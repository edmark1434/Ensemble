/**
 * Ticket chats belong in MongoDB (inbox + messages), linked via ticket_chats
 * per the ERD: TICKET ↔ TICKET_CHAT ↔ CHAT.
 *
 * Portal tickets live in support_tickets (legacy tickets table is unused).
 * Retarget ticket_chats to support_tickets, store Mongo ObjectId as text,
 * drop the mistaken Postgres ticket_messages thread table, and denormalize
 * message_count / last_message_at onto support_tickets for list queries.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.dropIndex('ticket_messages', 'ticket_id', {
    name: 'idx_ticket_messages_ticket',
    ifExists: true,
  });
  pgm.dropTable('ticket_messages', { ifExists: true });

  // Retarget link table from unused legacy tickets → support_tickets.
  pgm.sql(`
    ALTER TABLE ticket_chats
      DROP CONSTRAINT IF EXISTS ticket_chats_ticket_id_fkey
  `);
  pgm.sql(`DELETE FROM ticket_chats`);
  pgm.sql(`
    ALTER TABLE ticket_chats
      ALTER COLUMN chat_id TYPE text
      USING chat_id::text
  `);
  pgm.addConstraint(
    'ticket_chats',
    'ticket_chats_ticket_id_fkey',
    'FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE'
  );

  pgm.addColumns('support_tickets', {
    message_count: { type: 'integer', notNull: true, default: 0 },
    last_message_at: { type: 'timestamptz' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumns('support_tickets', ['message_count', 'last_message_at'], { ifExists: true });

  pgm.sql(`
    ALTER TABLE ticket_chats
      DROP CONSTRAINT IF EXISTS ticket_chats_ticket_id_fkey
  `);
  pgm.sql(`DELETE FROM ticket_chats`);
  pgm.sql(`
    ALTER TABLE ticket_chats
      ALTER COLUMN chat_id TYPE uuid
      USING '00000000-0000-0000-0000-000000000000'::uuid
  `);
  pgm.addConstraint(
    'ticket_chats',
    'ticket_chats_ticket_id_fkey',
    'FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)'
  );

  pgm.createTable('ticket_messages', {
    message_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    ticket_id: { type: 'uuid', notNull: true },
    author_account_id: { type: 'uuid' },
    author_type: { type: 'varchar(20)', notNull: true, default: 'user' },
    author_name: { type: 'varchar(100)' },
    body: { type: 'text', notNull: true },
    is_internal: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.addConstraint(
    'ticket_messages',
    'ticket_messages_ticket_id_fkey',
    'FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE'
  );
  pgm.addConstraint(
    'ticket_messages',
    'ticket_messages_author_account_id_fkey',
    'FOREIGN KEY (author_account_id) REFERENCES accounts(account_id)'
  );
  pgm.createIndex('ticket_messages', 'ticket_id', { name: 'idx_ticket_messages_ticket' });
};
