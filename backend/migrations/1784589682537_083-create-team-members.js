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
  });

  pgm.addConstraint('team_members', 'team_members_pkey', 'PRIMARY KEY (team_id, user_id)');
  pgm.addConstraint('team_members', 'team_members_team_id_fkey', 'FOREIGN KEY (team_id) REFERENCES teams(team_id)');
  pgm.addConstraint('team_members', 'team_members_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('team_members', { ifExists: true });
};
