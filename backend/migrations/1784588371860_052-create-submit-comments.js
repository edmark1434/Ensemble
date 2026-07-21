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
  pgm.createTable('submit_comments', {
    submit_comment_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    comment: { type: 'text', notNull: true },
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
    milestone_submit_id: { type: 'uuid', notNull: true },
    account_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('submit_comments', 'submit_comments_milestone_submit_id_fkey', 'FOREIGN KEY (milestone_submit_id) REFERENCES milestone_submits(milestone_submit_id)');
  pgm.addConstraint('submit_comments', 'submit_comments_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('submit_comments', { ifExists: true });
};
