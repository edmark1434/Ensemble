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
  pgm.createTable('gig_attachments', {
    gig_id: { type: 'uuid', notNull: true },
    file_id: { type: 'uuid', notNull: true },
    index: { type: 'integer', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });

  pgm.addConstraint('gig_attachments', 'gig_attachments_pkey', 'PRIMARY KEY (gig_id, file_id)');
  pgm.addConstraint('gig_attachments', 'gig_attachments_gig_id_fkey', 'FOREIGN KEY (gig_id) REFERENCES gigs(gig_id)');
  pgm.addConstraint('gig_attachments', 'gig_attachments_file_id_fkey', 'FOREIGN KEY (file_id) REFERENCES files(file_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_attachments', { ifExists: true });
};
