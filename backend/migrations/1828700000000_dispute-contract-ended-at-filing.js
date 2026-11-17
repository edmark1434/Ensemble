/**
 * Remember whether a contract dispute was filed after its contract had already ended.
 *
 * Members may still dispute a contract that is Done, Completed, Closed, Cancelled or
 * Rejected (to report conduct), but its milestone payments are final, so staff can only
 * record an outcome or sanction a party on those cases, never settle or reverse credits.
 *
 * The flag is a snapshot taken at filing time, not the contract's current status: settling
 * a dispute ends the contract itself, and withdrawing that ruling returns the credits to
 * escrow, so a case that started on a live contract must stay able to settle again.
 *
 * Backfill: an open case on a contract that has ended, with no money ruling and no payouts
 * ever, was filed after the end (a contract cannot end while its dispute is open except
 * through that dispute's own settlement).
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumns(
    'disputes',
    {
      contract_ended_at_filing: { type: 'boolean', notNull: true, default: false },
    },
    { ifNotExists: true }
  );

  pgm.sql(`
    UPDATE disputes d
    SET contract_ended_at_filing = true
    FROM contracts c
    WHERE c.contract_id = d.contract_id
      AND d.deleted_at IS NULL
      AND d.status <> 'closed'::dispute_status
      AND d.financial_resolution_at IS NULL
      AND LOWER(c.status) IN ('done', 'completed', 'closed', 'cancelled', 'rejected')
      AND NOT EXISTS (
        SELECT 1 FROM dispute_payouts p WHERE p.dispute_id = d.dispute_id
      )
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropColumns('disputes', ['contract_ended_at_filing'], { ifExists: true });
};
