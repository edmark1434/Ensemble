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

// A closed dispute still freezes the contract while its ruling has credits waiting to be paid.
const PENDING_PAYOUT_DISPUTE_SQL = `
  SELECT d.dispute_id, d.dispute_number, d.status
  FROM disputes d
  WHERE d.contract_id = $1
    AND d.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM dispute_payouts p
      WHERE p.dispute_id = d.dispute_id
        AND p.status IN ('scheduled', 'failed')
    )
  LIMIT 1
`;

function frozenEscrowError(dispute, { pendingPayout = false } = {}) {
  const number = dispute?.dispute_number ? ` ${dispute.dispute_number}` : '';
  const error = new Error(
    pendingPayout
      ? `Credits on this contract are held for the payout ruled on dispute${number}. Nothing can be released or refunded until that payout is complete.`
      : number
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
  WHERE ct.status IN ('Completed', 'Reversed')
    AND ${CONTRACT_LEDGER_SCOPE_SQL}
`;

async function remainingContractEscrowCredits(db, { disputeId, contractId }) {
  const result = await (db || pool).query(REMAINING_CONTRACT_ESCROW_SQL, [
    disputeId || null,
    contractId || null,
  ]);
  return Number(result.rows[0]?.remaining || 0);
}

// The same movement count, split per escrow wallet, so a settlement takes credits from the
// wallets that actually hold them (the client's own escrow before the freelancer accepts,
// the freelancer's escrow after). Escrow wallets are pooled across contracts, so this is
// the only safe way to know how much of a wallet's balance belongs to this contract.
const CONTRACT_ESCROW_HOLDINGS_SQL = `
  SELECT moves.wallet_id, aw.account_id, SUM(moves.delta)::int AS held
  FROM (
    SELECT ct.destination_wallet_id AS wallet_id, ct.amount_credits AS delta
    FROM credit_transactions ct
    JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
    WHERE ct.status IN ('Completed', 'Reversed')
      AND dw.type = 'escrow wallets'
      AND ${CONTRACT_LEDGER_SCOPE_SQL}
    UNION ALL
    SELECT ct.source_wallet_id AS wallet_id, -ct.amount_credits AS delta
    FROM credit_transactions ct
    JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
    WHERE ct.status IN ('Completed', 'Reversed')
      AND sw.type = 'escrow wallets'
      AND ${CONTRACT_LEDGER_SCOPE_SQL}
  ) moves
  LEFT JOIN account_wallets aw ON aw.wallet_id = moves.wallet_id
  GROUP BY moves.wallet_id, aw.account_id
  HAVING SUM(moves.delta) > 0
  ORDER BY SUM(moves.delta) DESC
`;

/** @returns {Promise<{ walletId: string, accountId: string|null, held: number }[]>} */
async function contractEscrowHoldings(db, { disputeId, contractId }) {
  if (!contractId) return [];
  const result = await (db || pool).query(CONTRACT_ESCROW_HOLDINGS_SQL, [
    disputeId || null,
    contractId,
  ]);
  return result.rows.map((row) => ({
    walletId: String(row.wallet_id),
    accountId: row.account_id ? String(row.account_id) : null,
    held: Number(row.held || 0),
  }));
}

async function getOpenContractDispute(db, contractId) {
  if (!contractId) return null;
  const result = await (db || pool).query(OPEN_DISPUTE_SQL, [contractId]);
  return result.rows[0] || null;
}

// Escrow guards run inside many callers' transactions, where a failed statement would abort
// the whole transaction. Check the payouts table exists (migration applied) before querying it.
let payoutsTableReady = false;
async function payoutsTableExists(runner) {
  if (payoutsTableReady) return true;
  const result = await runner.query(`SELECT to_regclass('public.dispute_payouts') AS t`);
  payoutsTableReady = Boolean(result.rows[0]?.t);
  return payoutsTableReady;
}

async function getPendingPayoutContractDispute(db, contractId) {
  if (!contractId) return null;
  const runner = db || pool;
  if (!(await payoutsTableExists(runner))) return null;
  const result = await runner.query(PENDING_PAYOUT_DISPUTE_SQL, [contractId]);
  return result.rows[0] || null;
}

async function assertNoOpenContractDispute(db, contractId) {
  const open = await getOpenContractDispute(db, contractId);
  if (open) throw frozenEscrowError(open);
  const pending = await getPendingPayoutContractDispute(db, contractId);
  if (pending) throw frozenEscrowError(pending, { pendingPayout: true });
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
  getPendingPayoutContractDispute,
  assertNoOpenContractDispute,
  freezeContractEscrowForDispute,
  remainingContractEscrowCredits,
  contractEscrowHoldings,
};
