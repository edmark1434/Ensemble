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
  pgm.alterColumn('teams', 'visibility', {
    default: 'Public',
  });

  pgm.sql(`
    UPDATE teams
    SET visibility = 'Public'
    WHERE job_id IS NULL 
      AND gig_id IS NULL 
      AND (team_type IS NULL OR team_type = 'standard');
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.alterColumn('teams', 'visibility', {
    default: 'Private',
  });
};
