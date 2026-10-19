/**
 * Member-chosen deactivation. reactivation_available_at is the end of the
 * 72-hour lock before the member can turn the account back on.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumn('accounts', {
    deactivated_at: { type: 'timestamptz' },
    reactivation_available_at: { type: 'timestamptz' },
  });
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS accounts_deactivated_at_idx
    ON accounts (deactivated_at)
    WHERE deactivated_at IS NOT NULL
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS accounts_deactivated_at_idx');
  pgm.dropColumn('accounts', ['reactivation_available_at', 'deactivated_at']);
};
