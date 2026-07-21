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
  pgm.createTable('gig_tags', {
    gig_id: { type: 'uuid', notNull: true },
    tag_id: { type: 'uuid', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });

  pgm.addConstraint('gig_tags', 'gig_tags_pkey', 'PRIMARY KEY (gig_id, tag_id)');
  pgm.addConstraint('gig_tags', 'gig_tags_gig_id_fkey', 'FOREIGN KEY (gig_id) REFERENCES gigs(gig_id)');
  pgm.addConstraint('gig_tags', 'gig_tags_tag_id_fkey', 'FOREIGN KEY (tag_id) REFERENCES tags(tag_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_tags', { ifExists: true });
};
