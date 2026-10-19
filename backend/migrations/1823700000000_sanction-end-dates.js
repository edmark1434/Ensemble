/**
 * Temporary bans and locks end on their own. A null end date means the
 * sanction stays until staff remove it.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumns('accounts', {
    ban_ends_at: { type: 'timestamptz' },
    lock_ends_at: { type: 'timestamptz' },
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropColumns('accounts', ['ban_ends_at', 'lock_ends_at']);
};
