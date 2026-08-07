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
  pgm.createTable('teams', {
    team_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    account_id: { type: 'uuid', notNull: true },
    join_code: { type: 'varchar(32)', unique: true },
    visibility: { type: 'varchar(20)', notNull: true, default: 'Public' },
    join_policy: { type: 'varchar(20)', notNull: true, default: 'Approval' },
    category: { type: 'varchar(80)' },
    website: { type: 'text' },
    location: { type: 'varchar(150)' },
    conversation_id: { type: 'varchar(100)' },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
  });

  pgm.addConstraint('teams', 'teams_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('teams', 'teams_account_id_unique', 'UNIQUE (account_id)');
  pgm.addConstraint('jobs', 'jobs_team_id_fkey', 'FOREIGN KEY (team_id) REFERENCES teams(team_id)');
  pgm.createIndex('teams', 'join_code');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('teams', { ifExists: true });
};
