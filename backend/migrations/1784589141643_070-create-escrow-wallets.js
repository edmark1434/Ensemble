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
  pgm.createTable('escrow_wallets', {
    wallet_id: { type: 'uuid', notNull: true },
    contract_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('escrow_wallets', 'escrow_wallets_pkey', 'PRIMARY KEY (wallet_id, contract_id)');
  pgm.addConstraint('escrow_wallets', 'escrow_wallets_wallet_id_fkey', 'FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id)');
  pgm.addConstraint('escrow_wallets', 'escrow_wallets_contract_id_fkey', 'FOREIGN KEY (contract_id) REFERENCES contracts(contract_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('escrow_wallets', { ifExists: true });
};

