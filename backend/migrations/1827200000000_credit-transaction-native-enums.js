/**
 * Match the ER diagram: credit_transactions.type and status are enums, not varchar.
 * Values come from backend/lib/CreditTransactionEnums.js.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
const {
  CREDIT_TRANSACTION_TYPES,
  CREDIT_TRANSACTION_STATUSES,
} = require('../lib/CreditTransactionEnums');

function sqlEnumLabels(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ');
}

exports.up = async (pgm) => {
  await pgm.db.query(`
    UPDATE credit_transactions
    SET type = CASE lower(btrim(COALESCE(type, '')))
      WHEN 'fund transfer' THEN 'Fund Transfer'
      WHEN 'escrow hold' THEN 'Escrow Hold'
      WHEN 'escrow release' THEN 'Escrow Release'
      WHEN 'escrow refund' THEN 'Escrow Refund'
      WHEN 'asset purchase' THEN 'Asset Purchase'
      WHEN 'asset refund' THEN 'Asset Refund'
      WHEN 'fee' THEN 'Fee'
      WHEN 'cashout' THEN 'Cashout'
      WHEN 'cashout refund' THEN 'Cashout Refund'
      WHEN 'job posting fee' THEN 'Job Posting Fee'
      WHEN 'job posting fee refund' THEN 'Job Posting Fee Refund'
      WHEN 'proposal fee' THEN 'Proposal Fee'
      WHEN 'proposal fee refund' THEN 'Proposal Fee Refund'
      WHEN 'service posting fee' THEN 'Service Posting Fee'
      WHEN 'gig posting fee' THEN 'Service Posting Fee'
      WHEN 'dispute hold' THEN 'Escrow Hold'
      WHEN 'credit freeze' THEN 'Escrow Hold'
      WHEN 'credit unfreeze' THEN 'Escrow Release'
      WHEN 'transfer' THEN 'Fund Transfer'
      WHEN 'hold' THEN 'Escrow Hold'
      WHEN 'release' THEN 'Escrow Release'
      WHEN 'refund' THEN 'Escrow Refund'
      WHEN 'purchase' THEN 'Asset Purchase'
      ELSE INITCAP(REPLACE(REPLACE(COALESCE(NULLIF(btrim(type), ''), 'Fund Transfer'), '_', ' '), '-', ' '))
    END
  `);
  await pgm.db.query(
    `UPDATE credit_transactions
     SET type = 'Fund Transfer'
     WHERE type IS NULL OR type NOT IN (${sqlEnumLabels(CREDIT_TRANSACTION_TYPES)})`
  );

  await pgm.db.query(`
    UPDATE credit_transactions
    SET status = CASE lower(btrim(COALESCE(status, '')))
      WHEN 'pending' THEN 'Pending'
      WHEN 'completed' THEN 'Completed'
      WHEN 'success' THEN 'Completed'
      WHEN 'paid' THEN 'Completed'
      WHEN 'failed' THEN 'Failed'
      WHEN 'failure' THEN 'Failed'
      WHEN 'reversed' THEN 'Reversed'
      WHEN 'refunded' THEN 'Reversed'
      ELSE 'Completed'
    END
  `);

  await pgm.db.query(`ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check`);
  await pgm.db.query(`ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_status_check`);

  // Partial indexes compare type to text literals. Postgres will not rewrite those
  // predicates onto an enum because the assignment cast is not IMMUTABLE.
  await pgm.db.query(`DROP INDEX IF EXISTS idx_credit_transactions_contract_release_once`);
  await pgm.db.query(`DROP INDEX IF EXISTS idx_credit_transactions_cashout_type_once`);
  await pgm.db.query(`DROP INDEX IF EXISTS idx_credit_transactions_topup_once`);

  await pgm.db.query(`DROP TYPE IF EXISTS credit_transaction_type`);
  await pgm.db.query(`DROP TYPE IF EXISTS credit_transaction_status`);
  await pgm.db.query(
    `CREATE TYPE credit_transaction_type AS ENUM (${sqlEnumLabels(CREDIT_TRANSACTION_TYPES)})`
  );
  await pgm.db.query(
    `CREATE TYPE credit_transaction_status AS ENUM (${sqlEnumLabels(CREDIT_TRANSACTION_STATUSES)})`
  );

  await pgm.db.query(`
    ALTER TABLE credit_transactions
      ALTER COLUMN type TYPE credit_transaction_type USING type::credit_transaction_type,
      ALTER COLUMN status TYPE credit_transaction_status USING status::credit_transaction_status
  `);
  await pgm.db.query(`
    ALTER TABLE credit_transactions
      ALTER COLUMN status SET DEFAULT 'Completed'::credit_transaction_status
  `);

  await pgm.db.query(`
    CREATE UNIQUE INDEX idx_credit_transactions_contract_release_once
      ON credit_transactions (reference_id)
      WHERE type = 'Escrow Release'::credit_transaction_type
        AND reference_table = 'contracts'
  `);
  await pgm.db.query(`
    CREATE UNIQUE INDEX idx_credit_transactions_cashout_type_once
      ON credit_transactions (type, reference_id)
      WHERE reference_table = 'cashouts'
        AND type IN (
          'Cashout'::credit_transaction_type,
          'Cashout Refund'::credit_transaction_type
        )
  `);
  await pgm.db.query(`
    CREATE UNIQUE INDEX idx_credit_transactions_topup_once
      ON credit_transactions (reference_id)
      WHERE reference_table = 'payments'
        AND type = 'Fund Transfer'::credit_transaction_type
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`DROP INDEX IF EXISTS idx_credit_transactions_contract_release_once`);
  await pgm.db.query(`DROP INDEX IF EXISTS idx_credit_transactions_cashout_type_once`);
  await pgm.db.query(`DROP INDEX IF EXISTS idx_credit_transactions_topup_once`);

  await pgm.db.query(`ALTER TABLE credit_transactions ALTER COLUMN status DROP DEFAULT`);
  await pgm.db.query(`
    ALTER TABLE credit_transactions
      ALTER COLUMN type TYPE varchar(50) USING type::text,
      ALTER COLUMN status TYPE varchar(50) USING status::text
  `);
  await pgm.db.query(`DROP TYPE IF EXISTS credit_transaction_type`);
  await pgm.db.query(`DROP TYPE IF EXISTS credit_transaction_status`);
  await pgm.db.query(`
    ALTER TABLE credit_transactions
      ADD CONSTRAINT credit_transactions_type_check
      CHECK (type IN (${sqlEnumLabels(CREDIT_TRANSACTION_TYPES)}))
  `);

  await pgm.db.query(`
    CREATE UNIQUE INDEX idx_credit_transactions_contract_release_once
      ON credit_transactions (reference_id)
      WHERE type = 'Escrow Release'
        AND reference_table = 'contracts'
  `);
  await pgm.db.query(`
    CREATE UNIQUE INDEX idx_credit_transactions_cashout_type_once
      ON credit_transactions (type, reference_id)
      WHERE reference_table = 'cashouts' AND type IN ('Cashout', 'Cashout Refund')
  `);
  await pgm.db.query(`
    CREATE UNIQUE INDEX idx_credit_transactions_topup_once
      ON credit_transactions (reference_id)
      WHERE reference_table = 'payments' AND type = 'Fund Transfer'
  `);
};
