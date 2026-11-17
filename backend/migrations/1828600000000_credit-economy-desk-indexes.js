/**
 * Indexes for the staff Credits & Economy desk.
 *
 * The desk pages the whole credit ledger newest-first, opens one wallet's history, and
 * sums the last 30 days of movement. None of that had an index: every wallet detail and
 * ledger page scanned credit_transactions. Staff adjustments are found through their
 * CREDITS_ADJUSTED account_activity row, which references the ledger row by id.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_created
      ON credit_transactions (created_at DESC, credit_transaction_id DESC);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_source_created
      ON credit_transactions (source_wallet_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_destination_created
      ON credit_transactions (destination_wallet_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_account_activity_credit_adjustment_ref
      ON account_activity (reference_id)
      WHERE event_code = 'CREDITS_ADJUSTED';
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_account_activity_credit_adjustment_ref;
    DROP INDEX IF EXISTS idx_credit_transactions_destination_created;
    DROP INDEX IF EXISTS idx_credit_transactions_source_created;
    DROP INDEX IF EXISTS idx_credit_transactions_created;
  `);
};
