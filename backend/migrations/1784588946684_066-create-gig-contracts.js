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
  pgm.createTable('gig_contracts', {
    contract_id: { type: 'uuid', notNull: true },
    gig_request_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('gig_contracts', 'gig_contracts_pkey', 'PRIMARY KEY (contract_id, gig_request_id)');
  pgm.addConstraint('gig_contracts', 'gig_contracts_contract_id_fkey', 'FOREIGN KEY (contract_id) REFERENCES contracts(contract_id)');
  pgm.addConstraint('gig_contracts', 'gig_contracts_gig_request_id_fkey', 'FOREIGN KEY (gig_request_id) REFERENCES gig_requests(gig_request_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_contracts', { ifExists: true });
};
