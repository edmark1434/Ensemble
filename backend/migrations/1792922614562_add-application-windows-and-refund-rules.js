exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Expand credit_transactions check constraint to include 'Job Posting Fee Refund'
  pgm.sql(`
    DO $$
    DECLARE
        constraint_name text;
    BEGIN
        SELECT conname INTO constraint_name
        FROM pg_constraint
        WHERE conrelid = 'credit_transactions'::regclass AND contype = 'c';

        IF constraint_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE credit_transactions DROP CONSTRAINT ' || constraint_name;
        END IF;

        ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_type_check 
        CHECK (type IN (
          'Fund Transfer', 'Escrow Hold', 'Escrow Release', 'Escrow Refund', 
          'Asset Purchase', 'Asset Refund', 'Fee', 'Cashout', 'Cashout Refund', 
          'Job Posting Fee', 'Job Posting Fee Refund', 'Proposal Fee', 'Proposal Fee Refund'
        ));
    END $$;
  `);

  // 2. Add application windows, rush flags, and refund tracking columns to jobs
  pgm.addColumns('jobs', {
    application_deadline: {
      type: 'timestamp with time zone',
      notNull: false,
    },
    is_urgent: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    hard_deadline: {
      type: 'timestamp with time zone',
      notNull: false,
    },
    posting_fee_credits: {
      type: 'integer',
      notNull: true,
      default: 50,
    },
    application_extended_at: {
      type: 'timestamp with time zone',
      notNull: false,
    },
    free_extension_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
  });

  // 3. Backfill application_deadline from rough_deadline for open jobs
  pgm.sql(`
    UPDATE jobs 
    SET application_deadline = rough_deadline 
    WHERE application_deadline IS NULL AND rough_deadline IS NOT NULL;
  `);

  // 4. Add submission_fee_credits to proposals
  pgm.addColumns('proposals', {
    submission_fee_credits: {
      type: 'integer',
      notNull: true,
      default: 10,
    },
  });

  // 5. Create index for fast auto-expiration queries
  pgm.createIndex('jobs', ['status', 'application_deadline'], {
    name: 'idx_jobs_status_application_deadline',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('jobs', ['status', 'application_deadline'], {
    name: 'idx_jobs_status_application_deadline',
  });

  pgm.dropColumns('proposals', ['submission_fee_credits']);

  pgm.dropColumns('jobs', [
    'application_deadline',
    'is_urgent',
    'hard_deadline',
    'posting_fee_credits',
    'application_extended_at',
    'free_extension_count',
  ]);

  pgm.sql(`
    DO $$
    DECLARE
        constraint_name text;
    BEGIN
        SELECT conname INTO constraint_name
        FROM pg_constraint
        WHERE conrelid = 'credit_transactions'::regclass AND contype = 'c';

        IF constraint_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE credit_transactions DROP CONSTRAINT ' || constraint_name;
        END IF;

        ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_type_check 
        CHECK (type IN (
          'Fund Transfer', 'Escrow Hold', 'Escrow Release', 'Escrow Refund', 
          'Asset Purchase', 'Asset Refund', 'Fee', 'Cashout', 'Cashout Refund', 
          'Job Posting Fee', 'Proposal Fee', 'Proposal Fee Refund'
        ));
    END $$;
  `);
};
