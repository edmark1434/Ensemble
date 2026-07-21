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
  pgm.createTable('submit_attachments', {
    milestone_submit_id: { type: 'uuid', notNull: true },
    file_id: { type: 'uuid', notNull: true },
    index: { type: 'integer', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });

  pgm.addConstraint('submit_attachments', 'submit_attachments_pkey', 'PRIMARY KEY (milestone_submit_id, file_id)');
  pgm.addConstraint('submit_attachments', 'submit_attachments_milestone_submit_id_fkey', 'FOREIGN KEY (milestone_submit_id) REFERENCES milestone_submits(milestone_submit_id)');
  pgm.addConstraint('submit_attachments', 'submit_attachments_file_id_fkey', 'FOREIGN KEY (file_id) REFERENCES files(file_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('submit_attachments', { ifExists: true });
};