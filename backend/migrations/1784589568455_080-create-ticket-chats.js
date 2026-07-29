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
    ticket_chat_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },last_message_at: {
      type: 'timestamp without time zone'
    },
    deleted_at: { type: 'timestamp without time zone' },
  });

};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('ticket_chats', { ifExists: true });
};
