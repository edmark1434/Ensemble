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
  pgm.addColumn('account_badges', {
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    granted_by_staff_id: { type: 'uuid' },
    grant_message: { type: 'text' },
    claimed_at: { type: 'timestamp with time zone' },
    revoked_at: { type: 'timestamp with time zone' }
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropColumn('account_badges', 'status');
  pgm.dropColumn('account_badges', 'granted_by_staff_id');
  pgm.dropColumn('account_badges', 'grant_message');
  pgm.dropColumn('account_badges', 'claimed_at');
  pgm.dropColumn('account_badges', 'revoked_at');
};
