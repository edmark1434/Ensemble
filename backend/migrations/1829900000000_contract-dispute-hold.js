/**
 * Contracts during and after a dispute.
 *
 * While a dispute on a contract is open, or a ruling's payout on it is still waiting, the contract
 * is on hold: escrow is frozen and its clock stops. When the hold lifts, every deadline, review
 * window and auto-cancel time moves forward by the time spent on hold
 * (`syncContractDisputeHold` in backend/repositories/ContractDisputeHoldRepositories.js).
 *
 *   contracts.dispute_hold_since       when the current hold began (NULL when not on hold)
 *   contracts.dispute_settlement_end   what an escrow settlement ruling changed when it ended the
 *                                      contract, so withdrawing the ruling can restore it exactly
 *   milestone_submits.review_paused_for  time a submission's review window spent on hold; the
 *                                      auto-approve and review-reminder clocks add it
 *
 * Timestamps here are `timestamp without time zone`, like the deadline columns they are compared with.
 *
 * Backfill: live contracts that are on hold right now start their hold when the earliest such
 * dispute was filed. Contracts whose settlement ruling still stands are ended by the reconcile job.
 */

const ENDED = `('done', 'completed', 'closed', 'cancelled', 'rejected')`;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumns(
    'contracts',
    {
      dispute_hold_since: { type: 'timestamp without time zone' },
      dispute_settlement_end: { type: 'jsonb' },
    },
    { ifNotExists: true }
  );

  pgm.addColumns(
    'milestone_submits',
    {
      review_paused_for: { type: 'interval', notNull: true, default: pgm.func(`'0'::interval`) },
    },
    { ifNotExists: true }
  );

  pgm.sql(`
    UPDATE contracts c
    SET dispute_hold_since = h.since
    FROM (
      SELECT d.contract_id, MIN(d.created_at)::timestamp AS since
      FROM disputes d
      WHERE d.contract_id IS NOT NULL
        AND d.deleted_at IS NULL
        AND (
          d.status <> 'closed'
          OR EXISTS (
            SELECT 1 FROM dispute_payouts p
            WHERE p.dispute_id = d.dispute_id
              AND p.status IN ('scheduled', 'failed')
          )
        )
      GROUP BY d.contract_id
    ) h
    WHERE h.contract_id = c.contract_id
      AND LOWER(c.status) NOT IN ${ENDED}
      AND c.dispute_hold_since IS NULL
  `);

  pgm.createIndex('contracts', 'dispute_hold_since', {
    name: 'contracts_dispute_hold_since_idx',
    where: 'dispute_hold_since IS NOT NULL',
    ifNotExists: true,
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropIndex('contracts', 'dispute_hold_since', {
    name: 'contracts_dispute_hold_since_idx',
    ifExists: true,
  });
  pgm.dropColumns('milestone_submits', ['review_paused_for'], { ifExists: true });
  pgm.dropColumns('contracts', ['dispute_hold_since', 'dispute_settlement_end'], { ifExists: true });
};
