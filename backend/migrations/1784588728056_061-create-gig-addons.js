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
  pgm.createTable('gig_addons', {
    gig_addon_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    name: { type: 'varchar(50)', notNull: true },
    price_credits: { type: 'integer', notNull: true },
    additional_days: { type: 'integer', notNull: true },
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

  pgm.addConstraint('gig_addons', 'gig_addons_gig_id_fkey', 'FOREIGN KEY (gig_id) REFERENCES gigs(gig_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_addons', { ifExists: true });
};

