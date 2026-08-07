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
  pgm.createTable('jobs', {
    job_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    title: { type: 'varchar(50)', notNull: true },
    description: { type: 'text', notNull: true },
    payment_type: { type: 'varchar(50)', notNull: true },
    experience_level: { type: 'varchar(50)', notNull: true },
    no_of_hires: { type: 'integer', notNull: true, default: 1 },
    rough_deadline: { type: 'timestamp without time zone', notNull: true },
    rough_duration_hrs: { type: 'integer' },
    rough_no_of_revisions: { type: 'integer', notNull: true, default: 0 },
    rate_credits_min: { type: 'integer', notNull: true },
    rate_credits_max: { type: 'integer', notNull: true },
    weekly_hrs_max: { type: 'integer' },
    status: { type: 'varchar(50)', notNull: true },
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
    last_viewed_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    client_account_id: { type: 'uuid', notNull: true },
    category: { type: 'varchar(50)' },
    posted_as: { type: 'varchar(50)' },
    team_id: { type: 'uuid' },
    timeline_min: { type: 'integer' },
    timeline_max: { type: 'integer' },
  });

  pgm.addConstraint('jobs', 'jobs_client_account_id_fkey', 'FOREIGN KEY (client_account_id) REFERENCES accounts(account_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('jobs', { ifExists: true });
};
