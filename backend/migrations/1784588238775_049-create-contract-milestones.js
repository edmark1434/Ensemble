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
  pgm.createTable('contract_milestones', {
    contract_milestone_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    index: { type: 'integer', notNull: true },
    name: { type: 'varchar(50)', notNull: true },
    description: { type: 'text', notNull: true },
    deadline: { type: 'integer', notNull: true },
    no_of_revisions_max: { type: 'integer', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    contract_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('contract_milestones', 'contract_milestones_contract_id_fkey', 'FOREIGN KEY (contract_id) REFERENCES contracts(contract_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('contract_milestones', { ifExists: true });
};
