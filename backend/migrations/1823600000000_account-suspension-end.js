/**
 * Suspension is temporary. suspension_ends_at is when read-only access ends
 * and the account returns to Active.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumn('accounts', {
    suspension_ends_at: { type: 'timestamptz' },
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropColumn('accounts', 'suspension_ends_at');
};
