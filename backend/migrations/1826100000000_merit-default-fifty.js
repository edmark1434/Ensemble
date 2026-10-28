/**
 * New user accounts start at Established (50). Team rows keep 0 and do not show a ring.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.alterColumn('accounts', 'merit_score', { default: 50 });
  pgm.sql(`
    UPDATE accounts
    SET merit_score = 50
    WHERE LOWER(type) = 'user'
      AND merit_score = 0
      AND deleted_at IS NULL
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.alterColumn('accounts', 'merit_score', { default: 0 });
};
