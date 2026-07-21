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
  pgm.createTable('account_badges', {
    badge_id: { type: 'uuid', notNull: true },
    account_id: { type: 'uuid', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });

  pgm.addConstraint('account_badges', 'account_badges_pkey', 'PRIMARY KEY (badge_id, account_id)');
  pgm.addConstraint('account_badges', 'account_badges_badge_id_fkey', 'FOREIGN KEY (badge_id) REFERENCES badges(badge_id)');
  pgm.addConstraint('account_badges', 'account_badges_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('account_badges', { ifExists: true });
};
