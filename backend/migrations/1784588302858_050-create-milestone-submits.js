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
  pgm.createTable('milestone_submits', {
    milestone_submit_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    index: { type: 'integer', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    submitted_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    responded_at: { type: 'timestamp without time zone' },
    contract_milestone_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('milestone_submits', 'milestone_submits_contract_milestone_id_fkey', 'FOREIGN KEY (contract_milestone_id) REFERENCES contract_milestones(contract_milestone_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('milestone_submits', { ifExists: true });
};
