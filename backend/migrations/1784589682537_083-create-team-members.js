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
  pgm.createTable('team_members', {
    team_id: { type: 'uuid', notNull: true },
    user_id: { type: 'uuid', notNull: true },
    role: { type: 'varchar(50)', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    joined_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    invited_by_account_id: { type: 'uuid' },
    invited_at: { type: 'timestamp without time zone' },
    invitation_expires_at: { type: 'timestamp without time zone' },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });

  pgm.addConstraint('team_members', 'team_members_pkey', 'PRIMARY KEY (team_id, user_id)');
  pgm.addConstraint('team_members', 'team_members_team_id_fkey', 'FOREIGN KEY (team_id) REFERENCES teams(team_id)');
  pgm.addConstraint('team_members', 'team_members_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id)');
  pgm.addConstraint('team_members', 'team_members_invited_by_account_id_fkey', 'FOREIGN KEY (invited_by_account_id) REFERENCES accounts(account_id) ON DELETE SET NULL');
  pgm.createIndex('team_members', 'status');
  pgm.createIndex('team_members', 'role');

  pgm.createTable('team_reviews', {
    team_review_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    team_id: { type: 'uuid', notNull: true, references: 'teams', onDelete: 'CASCADE' },
    reviewer_account_id: { type: 'uuid', notNull: true, references: 'accounts', onDelete: 'CASCADE' },
    rating: { type: 'smallint', notNull: true },
    comment: { type: 'text' },
    reference_type: { type: 'varchar(50)' },
    reference_id: { type: 'uuid' },
    created_at: { type: 'timestamp without time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('team_reviews', 'team_reviews_rating_check', 'CHECK (rating BETWEEN 1 AND 5)');
  pgm.addConstraint('team_reviews', 'team_reviews_unique_reference', 'UNIQUE (team_id, reviewer_account_id, reference_type, reference_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('team_reviews', { ifExists: true });
  pgm.dropTable('team_members', { ifExists: true });
};
