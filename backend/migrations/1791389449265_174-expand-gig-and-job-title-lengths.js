/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Expand title, name, and question columns that were previously restricted to varchar(50)
 * causing "value too long for type character varying(50)" errors on user inputs.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.alterColumn('gigs', 'title', { type: 'varchar(255)' });
  pgm.alterColumn('gig_tiers', 'title', { type: 'varchar(255)' });
  pgm.alterColumn('gig_milestones', 'name', { type: 'varchar(255)' });
  pgm.alterColumn('gig_requirements', 'question', { type: 'text' });
  pgm.alterColumn('gig_requirement_choices', 'name', { type: 'varchar(255)' });
  pgm.alterColumn('gig_addons', 'name', { type: 'varchar(255)' });
  pgm.alterColumn('gig_features', 'name', { type: 'varchar(255)' });
  pgm.alterColumn('contract_milestones', 'name', { type: 'varchar(255)' });
  pgm.alterColumn('jobs', 'title', { type: 'varchar(255)' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.alterColumn('jobs', 'title', { type: 'varchar(50)' });
  pgm.alterColumn('contract_milestones', 'name', { type: 'varchar(50)' });
  pgm.alterColumn('gig_features', 'name', { type: 'varchar(50)' });
  pgm.alterColumn('gig_addons', 'name', { type: 'varchar(50)' });
  pgm.alterColumn('gig_requirement_choices', 'name', { type: 'varchar(50)' });
  pgm.alterColumn('gig_requirements', 'question', { type: 'varchar(50)' });
  pgm.alterColumn('gig_milestones', 'name', { type: 'varchar(50)' });
  pgm.alterColumn('gig_tiers', 'title', { type: 'varchar(50)' });
  pgm.alterColumn('gigs', 'title', { type: 'varchar(50)' });
};
