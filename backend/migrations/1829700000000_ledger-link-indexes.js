/**
 * Indexes for the Credits & Economy ledger links and scope filters.
 *
 * Every ledger row now shows both sides of its links: a fee row finds the sale it was
 * charged on (`fee_transaction_id` points from the sale to the fee), an original finds the
 * row that reversed it, and an entry lists the rest of its reference, dispute and contract
 * escrow. Those are reverse lookups that had no index:
 * - `fee_transaction_id` had only its foreign key;
 * - `reverses_credit_transaction_id` had only a unique partial index on Completed/Pending
 *   reverses, which does not serve "any reverse of this row";
 * - `reference_id` had only partial unique indexes for top-ups, cashouts and releases;
 * - `escrow_wallets` is keyed (wallet_id, contract_id), so finding a contract's wallets scanned it.
 *
 * The desk works without these (the same queries, slower).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_fee_link
      ON credit_transactions (fee_transaction_id)
      WHERE fee_transaction_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_reverses_any
      ON credit_transactions (reverses_credit_transaction_id)
      WHERE reverses_credit_transaction_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference
      ON credit_transactions (reference_id, reference_table)
      WHERE reference_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_escrow_wallets_contract
      ON escrow_wallets (contract_id);
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_escrow_wallets_contract;
    DROP INDEX IF EXISTS idx_credit_transactions_reference;
    DROP INDEX IF EXISTS idx_credit_transactions_reverses_any;
    DROP INDEX IF EXISTS idx_credit_transactions_fee_link;
  `);
};
