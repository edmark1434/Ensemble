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
  pgm.createTable('proposal_milestones', {
    proposal_milestone_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    index: { type: 'integer', notNull: true },
    name: { type: 'varchar(50)', notNull: true },
    description: { type: 'text', notNull: true },
    duration_hrs: { type: 'integer', notNull: true },
    no_of_revisions_max: { type: 'integer', notNull: true, default: 0 },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    proposal_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('proposal_milestones', 'proposal_milestones_proposal_id_fkey', 'FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('proposal_milestones', { ifExists: true });
};

