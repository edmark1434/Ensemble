/**
 * Continue or end a contract after its dispute.
 *
 * When a dispute closes without a ruling that ends the contract (resolve, dismiss, convict, a
 * reversal once paid), the contract does not resume on its own. Both parties are asked whether
 * to continue; the contract stays on hold (clock stopped, escrow frozen) until they answer:
 *   - both choose continue        → it resumes, and a new dispute round starts (each side may
 *                                   file again; disputes before `resolved_at` no longer count)
 *   - either chooses end          → it ends under the cancellation rules (approved milestones
 *                                   stay paid, unfinished escrow goes back to the client)
 *   - nobody ends it by `decide_by` → it continues (silence never moves money)
 * A reopened case or a new ruling supersedes a pending decision.
 * Logic: backend/services/ContractDisputeHoldServices.js.
 *
 * Timestamps are `timestamp without time zone`, like the contract deadline columns.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.createTable(
    'contract_dispute_decisions',
    {
      decision_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      contract_id: {
        type: 'uuid',
        notNull: true,
        references: 'contracts(contract_id)',
        onDelete: 'CASCADE',
      },
      // The case whose closing asked the question.
      dispute_id: {
        type: 'uuid',
        references: 'disputes(dispute_id)',
        onDelete: 'SET NULL',
      },
      status: { type: 'varchar(20)', notNull: true, default: 'pending' },
      client_choice: { type: 'varchar(10)' },
      client_chosen_at: { type: 'timestamp without time zone' },
      client_chosen_by: { type: 'uuid' },
      freelancer_choice: { type: 'varchar(10)' },
      freelancer_chosen_at: { type: 'timestamp without time zone' },
      freelancer_chosen_by: { type: 'uuid' },
      decide_by: { type: 'timestamp without time zone', notNull: true },
      reminded_at: { type: 'timestamp without time zone' },
      // both_continued | auto_continued | ended_by_client | ended_by_freelancer | reopened | contract_ended
      resolution: { type: 'varchar(30)' },
      resolved_at: { type: 'timestamp without time zone' },
      created_at: {
        type: 'timestamp without time zone',
        notNull: true,
        default: pgm.func('LOCALTIMESTAMP'),
      },
    },
    { ifNotExists: true }
  );

  pgm.addConstraint('contract_dispute_decisions', 'contract_dispute_decisions_status_check', {
    check: "status IN ('pending', 'continued', 'ended', 'superseded')",
  });
  pgm.addConstraint('contract_dispute_decisions', 'contract_dispute_decisions_choice_check', {
    check:
      "(client_choice IS NULL OR client_choice IN ('continue', 'end')) AND " +
      "(freelancer_choice IS NULL OR freelancer_choice IN ('continue', 'end'))",
  });

  // At most one open question per contract.
  pgm.createIndex('contract_dispute_decisions', 'contract_id', {
    name: 'contract_dispute_decisions_one_pending',
    unique: true,
    where: "status = 'pending'",
  });
  pgm.createIndex('contract_dispute_decisions', ['status', 'decide_by'], {
    name: 'contract_dispute_decisions_pending_due',
    where: "status = 'pending'",
  });
  // Start of the current dispute round: the latest `continued` decision.
  pgm.createIndex('contract_dispute_decisions', ['contract_id', 'resolved_at'], {
    name: 'contract_dispute_decisions_continued',
    where: "status = 'continued'",
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropTable('contract_dispute_decisions', { ifExists: true });
};
