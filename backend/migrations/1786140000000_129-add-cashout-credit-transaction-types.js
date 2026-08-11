/** Adds cashout ledger types and guarantees one debit/refund entry per cashout. */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;
    ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_type_check
      CHECK (type IN (
        'Fund Transfer', 'Escrow Hold', 'Escrow Release', 'Escrow Refund',
        'Asset Purchase', 'Asset Refund', 'Fee', 'Cashout', 'Cashout Refund'
      ));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_cashout_type_once
      ON credit_transactions (type, reference_id)
      WHERE reference_table = 'cashouts' AND type IN ('Cashout', 'Cashout Refund');

    WITH platform_wallet AS (
      SELECT wallet_id FROM wallets WHERE type = 'platform wallets' AND status = 'active' LIMIT 1
    ), account_wallet AS (
      SELECT u.user_id, w.wallet_id
      FROM users u
      JOIN account_wallets aw ON aw.account_id = u.account_id
      JOIN wallets w ON w.wallet_id = aw.wallet_id AND w.type = 'account wallets'
    )
    INSERT INTO credit_transactions (
      type, amount_credits, status, source_wallet_id, destination_wallet_id,
      reference_table, reference_id, created_at
    )
    SELECT 'Cashout', c.amount_credits, 'completed', aw.wallet_id, pw.wallet_id,
           'cashouts', c.cashout_id, c.created_at
    FROM cashouts c
    JOIN account_wallet aw ON aw.user_id = c.user_id
    CROSS JOIN platform_wallet pw
    WHERE c.reference_id IS NOT NULL
    ON CONFLICT DO NOTHING;

    WITH platform_wallet AS (
      SELECT wallet_id FROM wallets WHERE type = 'platform wallets' AND status = 'active' LIMIT 1
    ), account_wallet AS (
      SELECT u.user_id, w.wallet_id
      FROM users u
      JOIN account_wallets aw ON aw.account_id = u.account_id
      JOIN wallets w ON w.wallet_id = aw.wallet_id AND w.type = 'account wallets'
    )
    INSERT INTO credit_transactions (
      type, amount_credits, status, source_wallet_id, destination_wallet_id,
      reference_table, reference_id, created_at
    )
    SELECT 'Cashout Refund', c.amount_credits, 'completed', pw.wallet_id, aw.wallet_id,
           'cashouts', c.cashout_id, COALESCE(c.refunded_at, c.updated_at)
    FROM cashouts c
    JOIN account_wallet aw ON aw.user_id = c.user_id
    CROSS JOIN platform_wallet pw
    WHERE c.reference_id IS NOT NULL AND c.refunded_at IS NOT NULL
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_credit_transactions_cashout_type_once;
    ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;
    ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_type_check
      CHECK (type IN (
        'Fund Transfer', 'Escrow Hold', 'Escrow Release', 'Escrow Refund',
        'Asset Purchase', 'Asset Refund', 'Fee'
      ));
  `);
};
