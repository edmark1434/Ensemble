const { pool } = require('./Database');

const FROZEN_ESCROW_MESSAGE =
  'Credits on this contract are frozen while a dispute is open. Escrow cannot be released or refunded until staff close the case.';

const OPEN_DISPUTE_SQL = `
  SELECT dispute_id, dispute_number, status
  FROM disputes
  WHERE contract_id = $1
    AND deleted_at IS NULL
    AND status <> 'closed'
  LIMIT 1
`;

function frozenEscrowError(dispute) {
  const number = dispute?.dispute_number ? ` ${dispute.dispute_number}` : '';
  const error = new Error(
    number
      ? `Credits on this contract are frozen while dispute${number} is open. Escrow cannot be released or refunded until staff close the case.`
      : FROZEN_ESCROW_MESSAGE
  );
  error.statusCode = 409;
  error.code = 'DISPUTE_ESCROW_FROZEN';
  return error;
}

// Ledger rows that belong to a contract: the contract itself, its milestones, paid milestone
// revisions (stored against the milestone id), and anything already linked to the dispute.
// $1 = dispute id, $2 = contract id.
const CONTRACT_LEDGER_SCOPE_SQL = `
  (
    ct.related_dispute_id = $1
    OR (ct.reference_table = 'contracts' AND ct.reference_id = $2)
    OR (
      ct.reference_table IN ('contract_milestones', 'contract_milestone_revisions')
      AND ct.reference_id IN (
        SELECT contract_milestone_id
        FROM contract_milestones
        WHERE contract_id = $2
      )
    )
  )
`;

// Credits still sitting in escrow for a contract, counted by wallet movement rather than by
// transaction label. Job contracts log two `Escrow Hold` rows for the same credits (client
// account → client escrow on offer, then client escrow → freelancer escrow on accept), so
// summing holds double-counts. Only money crossing into or out of escrow wallets counts;
// escrow-to-escrow hops net to zero, and fees taken from escrow count as leaving it.
const REMAINING_CONTRACT_ESCROW_SQL = `
  SELECT GREATEST(0, COALESCE(SUM(
    CASE
      WHEN dw.type = 'escrow wallets' AND COALESCE(sw.type, '') <> 'escrow wallets'
        THEN ct.amount_credits
      WHEN sw.type = 'escrow wallets' AND COALESCE(dw.type, '') <> 'escrow wallets'
        THEN -ct.amount_credits
      ELSE 0
    END
  ), 0))::int AS remaining
  FROM credit_transactions ct
  LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
  LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
  WHERE ct.status = 'Completed'
    AND ${CONTRACT_LEDGER_SCOPE_SQL}
`;

async function remainingContractEscrowCredits(db, { disputeId, contractId }) {
  const result = await (db || pool).query(REMAINING_CONTRACT_ESCROW_SQL, [
    disputeId || null,
    contractId || null,
  ]);
  return Number(result.rows[0]?.remaining || 0);
}

async function getOpenContractDispute(db, contractId) {
  if (!contractId) return null;
  const result = await (db || pool).query(OPEN_DISPUTE_SQL, [contractId]);
  return result.rows[0] || null;
}

async function assertNoOpenContractDispute(db, contractId) {
  const open = await getOpenContractDispute(db, contractId);
  if (open) throw frozenEscrowError(open);
  return null;
}

async function freezeContractEscrowForDispute(client, { disputeId, contractId }) {
  if (!client || !disputeId || !contractId) {
    return { related_credit_transaction_id: null, credit_amount_involved: 0 };
  }

  await client.query(
    `
    UPDATE credit_transactions ct
    SET related_dispute_id = $1
    WHERE ct.related_dispute_id IS NULL
      AND ${CONTRACT_LEDGER_SCOPE_SQL}
    `,
    [disputeId, contractId]
  );

  // The latest contract-level hold is the one that put the credits in the freelancer's escrow.
  const hold = await client.query(
    `
    SELECT credit_transaction_id
    FROM credit_transactions
    WHERE type = 'Escrow Hold'
      AND status = 'Completed'
      AND reference_table = 'contracts'
      AND reference_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [contractId]
  );

  const relatedCreditTransactionId = hold.rows[0]?.credit_transaction_id || null;
  const creditAmountInvolved = await remainingContractEscrowCredits(client, {
    disputeId,
    contractId,
  });

  await client.query(
    `
    UPDATE disputes
    SET related_credit_transaction_id = COALESCE($2, related_credit_transaction_id),
        credit_amount_involved = $3,
        updated_at = NOW()
    WHERE dispute_id = $1
    `,
    [disputeId, relatedCreditTransactionId, creditAmountInvolved]
  );

  return {
    related_credit_transaction_id: relatedCreditTransactionId,
    credit_amount_involved: creditAmountInvolved,
  };
}

module.exports = {
  FROZEN_ESCROW_MESSAGE,
  getOpenContractDispute,
  assertNoOpenContractDispute,
  freezeContractEscrowForDispute,
  remainingContractEscrowCredits,
};
