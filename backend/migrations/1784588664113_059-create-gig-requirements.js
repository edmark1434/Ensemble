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
  pgm.createTable('gig_requirements', {
    gig_requirement_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    type: { type: 'varchar(50)', notNull: true },
    question: { type: 'varchar(50)', notNull: true },
    is_required: { type: 'boolean', notNull: true, default: true },
    gig_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('gig_requirements', 'gig_requirements_gig_id_fkey', 'FOREIGN KEY (gig_id) REFERENCES gigs(gig_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_requirements', { ifExists: true });
};
