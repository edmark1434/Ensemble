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
  pgm.createTable('gig_milestones', {
    gig_milestone_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    index: { type: 'integer', notNull: true },
    name: { type: 'varchar(50)', notNull: true },
    description: { type: 'text', notNull: true },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    gig_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('gig_milestones', 'gig_milestones_gig_id_fkey', 'FOREIGN KEY (gig_id) REFERENCES gigs(gig_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_milestones', { ifExists: true });
};
