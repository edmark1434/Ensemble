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
  pgm.createTable('job_contracts', {
    contract_id: { type: 'uuid', notNull: true },
    proposal_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('job_contracts', 'job_contracts_pkey', 'PRIMARY KEY (contract_id, proposal_id)');
  pgm.addConstraint('job_contracts', 'job_contracts_contract_id_fkey', 'FOREIGN KEY (contract_id) REFERENCES contracts(contract_id)');
  pgm.addConstraint('job_contracts', 'job_contracts_proposal_id_fkey', 'FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id)');
};



/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('job_contracts', { ifExists: true });
};
