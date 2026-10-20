/**
 * Migration: 1824200000000_job_market_complete_enhancements.js
 * Enhancements:
 * 1. Add 'Proposal Fee Refund' to credit_transactions constraint
 * 2. Add screening_questions to jobs table
 * 3. Add screening_answers, viewed_at, and shortlisted_at to proposals table
 * 4. Create proposal_attachments table
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Update credit_transactions type constraint to include 'Proposal Fee Refund'
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

  // 2. Add screening_questions to jobs
  pgm.addColumns('jobs', {
    screening_questions: {
      type: 'jsonb',
      notNull: true,
      default: '[]'
    }
  });

  // 3. Add screening_answers, viewed_at, and shortlisted_at to proposals
  pgm.addColumns('proposals', {
    screening_answers: {
      type: 'jsonb',
      notNull: true,
      default: '[]'
    },
    viewed_at: {
      type: 'timestamp with time zone',
      notNull: false
    },
    shortlisted_at: {
      type: 'timestamp with time zone',
      notNull: false
    }
  });

  // 4. Create proposal_attachments table
  pgm.createTable('proposal_attachments', {
    proposal_attachment_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()')
    },
    proposal_id: {
      type: 'uuid',
      notNull: true,
      references: 'proposals(proposal_id)',
      onDelete: 'CASCADE'
    },
    file_id: {
      type: 'uuid',
      notNull: true,
      references: 'files(file_id)',
      onDelete: 'CASCADE'
    },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  pgm.createIndex('proposal_attachments', 'proposal_id');
  pgm.createIndex('proposal_attachments', 'file_id');
};

exports.down = (pgm) => {
  pgm.dropTable('proposal_attachments', { ifExists: true });

  pgm.dropColumns('proposals', ['screening_answers', 'viewed_at', 'shortlisted_at']);
  pgm.dropColumns('jobs', ['screening_questions']);

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
          'Job Posting Fee', 'Proposal Fee'
        ));
    END $$;
  `);
};
