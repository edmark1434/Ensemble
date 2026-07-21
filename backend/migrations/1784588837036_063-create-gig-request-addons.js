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
  pgm.createTable('gig_request_addons', {
    gig_request_id: { type: 'uuid', notNull: true },
    gig_addon_id: { type: 'uuid', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });

  pgm.addConstraint('gig_request_addons', 'gig_request_addons_pkey', 'PRIMARY KEY (gig_request_id, gig_addon_id)');
  pgm.addConstraint('gig_request_addons', 'gig_request_addons_gig_request_id_fkey', 'FOREIGN KEY (gig_request_id) REFERENCES gig_requests(gig_request_id)');
  pgm.addConstraint('gig_request_addons', 'gig_request_addons_gig_addon_id_fkey', 'FOREIGN KEY (gig_addon_id) REFERENCES gig_addons(gig_addon_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_request_addons', { ifExists: true });
};

