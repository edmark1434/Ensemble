exports.shorthands = undefined;

exports.up = (pgm) => {
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
        CHECK (type IN ('Fund Transfer', 'Escrow Hold', 'Escrow Release', 'Escrow Refund', 'Asset Purchase', 'Asset Refund', 'Fee', 'Cashout', 'Cashout Refund', 'Job Posting Fee', 'Proposal Fee'));
    END $$;
  `);
};

exports.down = (pgm) => {
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
        CHECK (type IN ('Fund Transfer', 'Escrow Hold', 'Escrow Release', 'Escrow Refund', 'Asset Purchase', 'Asset Refund', 'Fee', 'Cashout', 'Cashout Refund'));
    END $$;
  `);
};
