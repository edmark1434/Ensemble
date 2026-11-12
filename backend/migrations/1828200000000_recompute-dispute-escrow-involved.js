/**
 * Recompute `disputes.credit_amount_involved` for open contract disputes.
 *
 * The dispute freeze used to sum every `Escrow Hold` on the contract. Job contracts log two
 * holds for the same credits (client account → client escrow on offer, client escrow →
 * freelancer escrow on accept), so a 750-credit contract was stored as 1,500 involved.
 * `backend/lib/DisputeEscrow.js` now counts escrow by wallet movement; this applies the same
 * calculation to disputes that are already open. Closed disputes keep their stored value.
 *
 * `down` restores the old hold-sum figure for the same disputes.
 */

const contractLedgerScope = (milestoneTables) => `
  (
    ct.related_dispute_id = d.dispute_id
    OR (ct.reference_table = 'contracts' AND ct.reference_id = d.contract_id)
    OR (
      ct.reference_table IN ${milestoneTables}
      AND ct.reference_id IN (
        SELECT cm.contract_milestone_id
        FROM contract_milestones cm
        WHERE cm.contract_id = d.contract_id
      )
    )
  )
`;

const OPEN_CONTRACT_DISPUTES = `
  d.contract_id IS NOT NULL
  AND d.deleted_at IS NULL
  AND d.status <> 'closed'
  AND d.financial_resolution_at IS NULL
`;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE disputes d
    SET credit_amount_involved = (
      SELECT GREATEST(0, COALESCE(SUM(
        CASE
          WHEN dw.type = 'escrow wallets' AND COALESCE(sw.type, '') <> 'escrow wallets'
            THEN ct.amount_credits
          WHEN sw.type = 'escrow wallets' AND COALESCE(dw.type, '') <> 'escrow wallets'
            THEN -ct.amount_credits
          ELSE 0
        END
      ), 0))::int
      FROM credit_transactions ct
      LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
      LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
      WHERE ct.status = 'Completed'
        AND ${contractLedgerScope("('contract_milestones', 'contract_milestone_revisions')")}
    )
    WHERE ${OPEN_CONTRACT_DISPUTES}
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql(`
    UPDATE disputes d
    SET credit_amount_involved = (
      SELECT GREATEST(0,
        COALESCE(SUM(CASE WHEN ct.type = 'Escrow Hold' THEN ct.amount_credits ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN ct.type IN ('Escrow Release', 'Escrow Refund') THEN ct.amount_credits ELSE 0 END), 0)
      )::int
      FROM credit_transactions ct
      WHERE ct.status = 'Completed'
        AND ${contractLedgerScope("('contract_milestones')")}
    )
    WHERE ${OPEN_CONTRACT_DISPUTES}
  `);
};
