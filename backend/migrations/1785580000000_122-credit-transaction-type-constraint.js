/**
 * Canonical CREDIT_TRANSACTION.type values + CHECK constraint.
 *
 * Allowed:
 *   Fund Transfer, Escrow Hold, Escrow Release, Escrow Refund,
 *   Asset Purchase, Asset Refund, Fee
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE credit_transactions
    SET type = CASE lower(btrim(COALESCE(type, '')))
      WHEN 'fund transfer' THEN 'Fund Transfer'
      WHEN 'escrow hold' THEN 'Escrow Hold'
      WHEN 'escrow release' THEN 'Escrow Release'
      WHEN 'escrow refund' THEN 'Escrow Refund'
      WHEN 'asset purchase' THEN 'Asset Purchase'
      WHEN 'asset refund' THEN 'Asset Refund'
      WHEN 'fee' THEN 'Fee'
      WHEN 'dispute hold' THEN 'Escrow Hold'
      WHEN 'credit freeze' THEN 'Escrow Hold'
      WHEN 'hold' THEN 'Escrow Hold'
      WHEN 'credit unfreeze' THEN 'Escrow Release'
      WHEN 'release' THEN 'Escrow Release'
      WHEN 'credit adjustment' THEN 'Fund Transfer'
      WHEN 'admin credit grant' THEN 'Fund Transfer'
      WHEN 'admin credit deduction' THEN 'Fund Transfer'
      WHEN 'admin credit adjustment' THEN 'Fund Transfer'
      WHEN 'transfer' THEN 'Fund Transfer'
      WHEN 'refund' THEN 'Escrow Refund'
      WHEN 'purchase' THEN 'Asset Purchase'
      ELSE 'Fund Transfer'
    END
  `);

  pgm.sql(`
    ALTER TABLE credit_transactions
    DROP CONSTRAINT IF EXISTS credit_transactions_type_check
  `);

  pgm.sql(`
    ALTER TABLE credit_transactions
    ADD CONSTRAINT credit_transactions_type_check
    CHECK (type IN (
      'Fund Transfer',
      'Escrow Hold',
      'Escrow Release',
      'Escrow Refund',
      'Asset Purchase',
      'Asset Refund',
      'Fee'
    ))
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE credit_transactions
    DROP CONSTRAINT IF EXISTS credit_transactions_type_check
  `);
};
