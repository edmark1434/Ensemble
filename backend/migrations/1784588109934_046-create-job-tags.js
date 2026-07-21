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
  pgm.createTable('job_tags', {
    job_id: { type: 'uuid', notNull: true },
    tag_id: { type: 'uuid', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });

  pgm.addConstraint('job_tags', 'job_tags_pkey', 'PRIMARY KEY (job_id, tag_id)');
  pgm.addConstraint('job_tags', 'job_tags_job_id_fkey', 'FOREIGN KEY (job_id) REFERENCES jobs(job_id)');
  pgm.addConstraint('job_tags', 'job_tags_tag_id_fkey', 'FOREIGN KEY (tag_id) REFERENCES tags(tag_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('job_tags', { ifExists: true });
};
