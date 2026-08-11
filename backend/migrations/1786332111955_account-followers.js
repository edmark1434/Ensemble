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
  pgm.createTable('account_followers', {
    follower_id: {
      type: 'uuid',
      notNull: true,
      references: '"accounts"',
      onDelete: 'cascade',
    },
    followed_id: {
      type: 'uuid',
      notNull: true,
      references: '"accounts"',
      onDelete: 'cascade',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('account_followers', 'pk_account_followers', {
    primaryKey: ['follower_id', 'followed_id'],
  });

  // Prevent users from following themselves
  pgm.addConstraint('account_followers', 'chk_account_followers_different_users', {
    check: 'follower_id <> followed_id',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('account_followers');
};
