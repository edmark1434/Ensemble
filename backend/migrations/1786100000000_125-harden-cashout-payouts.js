/**
 * Adds the payout identifiers needed for provider and webhook idempotency.
 * Written as SQL guards so it can safely upgrade databases that already ran migration 072.
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE cashouts ALTER COLUMN xendit_disbursement_id DROP NOT NULL;
    ALTER TABLE cashouts ALTER COLUMN xendit_disbursement_id TYPE varchar(100);
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS reference_id varchar(100);
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS idempotency_key varchar(100);
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS failure_code varchar(100);
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS refunded_at timestamp without time zone;
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cashouts_reference_id
      ON cashouts (reference_id) WHERE reference_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cashouts_idempotency_key
      ON cashouts (idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_cashouts_user_created_at
      ON cashouts (user_id, created_at DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_cashouts_user_created_at;
    DROP INDEX IF EXISTS idx_cashouts_idempotency_key;
    DROP INDEX IF EXISTS idx_cashouts_reference_id;
    ALTER TABLE cashouts DROP COLUMN IF EXISTS refunded_at;
    ALTER TABLE cashouts DROP COLUMN IF EXISTS failure_code;
    ALTER TABLE cashouts DROP COLUMN IF EXISTS idempotency_key;
    ALTER TABLE cashouts DROP COLUMN IF EXISTS reference_id;
  `);
};
