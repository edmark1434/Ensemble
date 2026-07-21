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
  pgm.createTable('interview_messages', {
    interview_message_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    message: { type: 'text', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    interview_id: { type: 'uuid', notNull: true },
    account_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('interview_messages', 'interview_messages_interview_id_fkey', 'FOREIGN KEY (interview_id) REFERENCES interviews(interview_id)');
  pgm.addConstraint('interview_messages', 'interview_messages_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('interview_messages', { ifExists: true });
};
