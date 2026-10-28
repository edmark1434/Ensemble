/**
 * Migration to add 'Service Posting Fee' and 'Service Posting Fee Refund'
 * to credit_transactions check constraint.
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE
        c_record RECORD;
    BEGIN
        FOR c_record IN (
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'credit_transactions'::regclass AND contype = 'c'
        ) LOOP
            EXECUTE 'ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS ' || quote_ident(c_record.conname);
        END LOOP;

        ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_type_check 
        CHECK (type IN (
          'Fund Transfer', 'Escrow Hold', 'Escrow Release', 'Escrow Refund', 
          'Asset Purchase', 'Asset Refund', 'Fee', 'Cashout', 'Cashout Refund', 
          'Job Posting Fee', 'Job Posting Fee Refund', 'Proposal Fee', 'Proposal Fee Refund',
          'Service Posting Fee', 'Service Posting Fee Refund'
        ));
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE
        c_record RECORD;
    BEGIN
        FOR c_record IN (
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'credit_transactions'::regclass AND contype = 'c'
        ) LOOP
            EXECUTE 'ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS ' || quote_ident(c_record.conname);
        END LOOP;

        ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_type_check 
        CHECK (type IN (
          'Fund Transfer', 'Escrow Hold', 'Escrow Release', 'Escrow Refund', 
          'Asset Purchase', 'Asset Refund', 'Fee', 'Cashout', 'Cashout Refund', 
          'Job Posting Fee', 'Job Posting Fee Refund', 'Proposal Fee', 'Proposal Fee Refund'
        ));
    END $$;
  `);
};
