export const shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('teams', {
    join_code: { type: 'varchar(32)', unique: true },
    visibility: { type: 'varchar(20)', notNull: true, default: 'Public' },
    join_policy: { type: 'varchar(20)', notNull: true, default: 'Approval' },
    category: { type: 'varchar(80)' },
    website: { type: 'text' },
    location: { type: 'varchar(150)' },
    conversation_id: { type: 'varchar(100)' },
    created_at: { type: 'timestamp without time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp without time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    deleted_at: { type: 'timestamp without time zone' },
  });
  pgm.addColumns('team_members', {
    invited_by_account_id: { type: 'uuid' },
    invited_at: { type: 'timestamp without time zone' },
    invitation_expires_at: { type: 'timestamp without time zone' },
    updated_at: { type: 'timestamp without time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('team_members', 'team_members_invited_by_account_id_fkey', 'FOREIGN KEY (invited_by_account_id) REFERENCES accounts(account_id) ON DELETE SET NULL');
  pgm.addConstraint('teams', 'teams_account_id_unique', 'UNIQUE (account_id)');
  pgm.createIndex('teams', 'join_code', { ifNotExists: true });
  pgm.createIndex('team_members', 'status', { ifNotExists: true });
  pgm.createIndex('team_members', 'role', { ifNotExists: true });

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

exports.down = (pgm) => {
  pgm.dropTable('team_reviews', { ifExists: true });
  pgm.dropConstraint('teams', 'teams_account_id_unique', { ifExists: true });
  pgm.dropConstraint('team_members', 'team_members_invited_by_account_id_fkey', { ifExists: true });
  pgm.dropColumns('team_members', ['invited_by_account_id', 'invited_at', 'invitation_expires_at', 'updated_at']);
  pgm.dropColumns('teams', ['join_code', 'visibility', 'join_policy', 'category', 'website', 'location', 'conversation_id', 'created_at', 'updated_at', 'deleted_at']);
};
