/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('gig_saves', {
    gig_save_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()')
    },
    account_id: { type: 'uuid', notNull: true },
    gig_id: { type: 'uuid', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  pgm.addConstraint('gig_saves', 'gig_saves_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE');
  pgm.addConstraint('gig_saves', 'gig_saves_gig_id_fkey', 'FOREIGN KEY (gig_id) REFERENCES gigs(gig_id) ON DELETE CASCADE');
  pgm.addConstraint('gig_saves', 'unique_account_gig_save', 'UNIQUE(account_id, gig_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_saves', { ifExists: true });
};
