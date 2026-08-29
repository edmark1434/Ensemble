/**
 * Guarantee that contract escrow can be released only once.
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_contract_release_once
      ON credit_transactions (reference_id)
      WHERE type = 'Escrow Release'
        AND reference_table = 'contracts';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_credit_transactions_contract_release_once;
  `);
};
