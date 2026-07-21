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
  pgm.createTable('account_wallets', {
    wallet_id: { type: 'uuid', notNull: true },
    account_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('account_wallets', 'account_wallets_pkey', 'PRIMARY KEY (wallet_id, account_id)');
  pgm.addConstraint('account_wallets', 'account_wallets_wallet_id_fkey', 'FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id)');
  pgm.addConstraint('account_wallets', 'account_wallets_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES accounts(account_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('account_wallets', { ifExists: true });
};

