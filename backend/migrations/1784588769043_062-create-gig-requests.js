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
  pgm.createTable('gig_requests', {
    gig_request_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    status: { type: 'varchar(50)', notNull: true },
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
    client_account_id: { type: 'uuid', notNull: true },
    gig_tier_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('gig_requests', 'gig_requests_client_account_id_fkey', 'FOREIGN KEY (client_account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('gig_requests', 'gig_requests_gig_tier_id_fkey', 'FOREIGN KEY (gig_tier_id) REFERENCES gig_tiers(gig_tier_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_requests', { ifExists: true });
};

