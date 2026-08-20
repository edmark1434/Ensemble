/** Guarantees one top-up credit ledger entry per internal payment UUID. */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_topup_once
      ON credit_transactions (reference_id)
      WHERE reference_table = 'payments' AND type = 'Fund Transfer';
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS idx_credit_transactions_topup_once;');
};
