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
  pgm.createTable('gig_tiers', {
    gig_tier_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    title: { type: 'varchar(50)', notNull: true },
    description: { type: 'text', notNull: true },
    rate_credits: { type: 'integer', notNull: true },
    weekly_hrs_max: { type: 'integer' },
    delivery_days: { type: 'integer', notNull: true },
    no_of_revisions_max: { type: 'integer', notNull: true },
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
    gig_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('gig_tiers', 'gig_tiers_gig_id_fkey', 'FOREIGN KEY (gig_id) REFERENCES gigs(gig_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_tiers', { ifExists: true });
};
