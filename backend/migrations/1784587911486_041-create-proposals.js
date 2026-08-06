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
  pgm.createTable('proposals', {
    proposal_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    letter: { type: 'text', notNull: true },
    rate_credits: { type: 'integer', notNull: true },
    weekly_hrs_max: { type: 'integer' },
    revision_price_credits: { type: 'integer' },
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
    deleted_at: { type: 'timestamp without time zone' },
    job_id: { type: 'uuid', notNull: true },
    freelancer_account_id: { type: 'uuid', notNull: true },
    terms_id: { type: 'uuid' },
    reject_reason: { type: 'varchar(255)' },
  });

  pgm.addConstraint('proposals', 'proposals_job_id_fkey', 'FOREIGN KEY (job_id) REFERENCES jobs(job_id)');
  pgm.addConstraint('proposals', 'proposals_freelancer_account_id_fkey', 'FOREIGN KEY (freelancer_account_id) REFERENCES accounts(account_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('proposals', { ifExists: true });
};
