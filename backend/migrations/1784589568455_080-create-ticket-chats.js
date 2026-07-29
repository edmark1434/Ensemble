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
  pgm.createTable('ticket_chats', {
    ticket_id: { type: 'uuid', primaryKey: true, notNull: true },
    chat_id: { type: 'uuid', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
  });

  pgm.addConstraint('ticket_chats', 'ticket_chats_ticket_id_fkey', 'FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('ticket_chats', { ifExists: true });
};
