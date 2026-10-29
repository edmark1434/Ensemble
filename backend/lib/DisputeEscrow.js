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
    UPDATE credit_transactions
    SET related_dispute_id = $1
    WHERE related_dispute_id IS NULL
      AND (
        (reference_table = 'contracts' AND reference_id = $2)
        OR (
          reference_table = 'contract_milestones'
          AND reference_id IN (
            SELECT contract_milestone_id
            FROM contract_milestones
            WHERE contract_id = $2
          )
        )
      )
    `,
    [disputeId, contractId]
  );

  const hold = await client.query(
    `
    SELECT credit_transaction_id
    FROM credit_transactions
    WHERE type = 'Escrow Hold'
      AND status = 'Completed'
      AND (
        related_dispute_id = $1
        OR (reference_table = 'contracts' AND reference_id = $2)
      )
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [disputeId, contractId]
  );

  const remaining = await client.query(
    `
    SELECT GREATEST(0,
      COALESCE(SUM(CASE WHEN type = 'Escrow Hold' THEN amount_credits ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN type IN ('Escrow Release', 'Escrow Refund') THEN amount_credits ELSE 0 END), 0)
    )::int AS remaining
    FROM credit_transactions
    WHERE status = 'Completed'
      AND (
        related_dispute_id = $1
        OR (reference_table = 'contracts' AND reference_id = $2)
        OR (
          reference_table = 'contract_milestones'
          AND reference_id IN (
            SELECT contract_milestone_id
            FROM contract_milestones
            WHERE contract_id = $2
          )
        )
      )
    `,
    [disputeId, contractId]
  );

  const relatedCreditTransactionId = hold.rows[0]?.credit_transaction_id || null;
  const creditAmountInvolved = Number(remaining.rows[0]?.remaining || 0);

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
};
