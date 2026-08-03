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
  pgm.addColumns('jobs', {
    category: { type: 'varchar(50)' },
    posted_as: { type: 'varchar(50)' },
    team_id: { type: 'uuid' },
    timeline_min: { type: 'integer' },
    timeline_max: { type: 'integer' }
  });

  pgm.addConstraint('jobs', 'jobs_team_id_fkey', 'FOREIGN KEY (team_id) REFERENCES teams(team_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('jobs', 'jobs_team_id_fkey', { ifExists: true });
  pgm.dropColumns('jobs', ['category', 'posted_as', 'team_id', 'timeline_min', 'timeline_max']);
};
