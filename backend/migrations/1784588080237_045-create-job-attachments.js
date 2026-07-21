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
  pgm.createTable('job_attachments', {
    job_id: { type: 'uuid', notNull: true },
    file_id: { type: 'uuid', notNull: true },
    index: { type: 'integer', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });

  pgm.addConstraint('job_attachments', 'job_attachments_pkey', 'PRIMARY KEY (job_id, file_id)');
  pgm.addConstraint('job_attachments', 'job_attachments_job_id_fkey', 'FOREIGN KEY (job_id) REFERENCES jobs(job_id)');
  pgm.addConstraint('job_attachments', 'job_attachments_file_id_fkey', 'FOREIGN KEY (file_id) REFERENCES files(file_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('job_attachments', { ifExists: true });
};
