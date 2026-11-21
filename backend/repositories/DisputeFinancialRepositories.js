const { pool } = require('../lib/Database');
const {
  CREDIT_TRANSACTION_TYPE,
  CREDIT_TRANSACTION_STATUS,
} = require('../lib/CreditTransactionEnums');
const {
  remainingContractEscrowCredits,
  contractEscrowHoldings,
  milestonePaidOutSql,
  milestoneEscrowState,
  isContractEnded,
} = require('../lib/DisputeEscrow');

/**
 * Money rulings on disputes.
 *
 * A ruling (settle escrow, reverse a transaction) never pays the recipient on the spot.
 * It writes one `dispute_payouts` row per recipient with a release date, and the credits
 * stay locked in an escrow wallet until then:
 *   - settle: the credits are already in the contract's escrow; they stay where they are.
 *   - reverse: the credits are taken back from whoever received them right away, into that
 *     account's own escrow wallet, so they cannot be spent while the payout waits.
 * `releasePayout` moves them to the recipient and writes the ledger row. The background job
 * releases due payouts of closed cases; staff can release early, change the date, or (after
 * reopening the case) withdraw the ruling, which returns anything that was taken back.
 */

const ESCROW_WALLET = 'escrow wallets';
const ACCOUNT_WALLET = 'account wallets';
const WAITING_PAYOUT_STATUSES = ['scheduled', 'failed'];
const SETTLEMENT_PAYOUT_KINDS = ['escrow_refund', 'escrow_release'];
const SETTLEMENT_SPLIT_METHODS = ['amount', 'milestones', 'both'];

function domainError(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

/**
 * COMMIT, and fail loudly if nothing was saved. When any statement inside the transaction
 * failed and its error was swallowed, Postgres answers COMMIT with ROLLBACK and no error, so
 * a ruling would report "paid" while no credit moved.
 */
async function commitOrThrow(client) {
  const result = await client.query('COMMIT');
  if (String(result?.command || '').toUpperCase() === 'ROLLBACK') {
    throw domainError(
      'The ruling could not be saved, so no credits moved. Try again, or contact an engineer if it keeps failing.',
      500,
      'COMMIT_ROLLED_BACK'
    );
  }
}

function compensatingType(originalType) {
  switch (String(originalType || '')) {
    case CREDIT_TRANSACTION_TYPE.ESCROW_HOLD:
    case CREDIT_TRANSACTION_TYPE.ESCROW_RELEASE:
      return CREDIT_TRANSACTION_TYPE.ESCROW_REFUND;
    case CREDIT_TRANSACTION_TYPE.ESCROW_REFUND:
      return CREDIT_TRANSACTION_TYPE.ESCROW_RELEASE;
    case CREDIT_TRANSACTION_TYPE.ASSET_PURCHASE:
      return CREDIT_TRANSACTION_TYPE.ASSET_REFUND;
    case CREDIT_TRANSACTION_TYPE.ASSET_REFUND:
      return CREDIT_TRANSACTION_TYPE.ASSET_PURCHASE;
    case CREDIT_TRANSACTION_TYPE.CASHOUT:
      return CREDIT_TRANSACTION_TYPE.CASHOUT_REFUND;
    case CREDIT_TRANSACTION_TYPE.CASHOUT_REFUND:
      return CREDIT_TRANSACTION_TYPE.CASHOUT;
    case CREDIT_TRANSACTION_TYPE.JOB_POSTING_FEE:
      return CREDIT_TRANSACTION_TYPE.JOB_POSTING_FEE_REFUND;
    case CREDIT_TRANSACTION_TYPE.JOB_POSTING_FEE_REFUND:
      return CREDIT_TRANSACTION_TYPE.JOB_POSTING_FEE;
    case CREDIT_TRANSACTION_TYPE.PROPOSAL_FEE:
      return CREDIT_TRANSACTION_TYPE.PROPOSAL_FEE_REFUND;
    case CREDIT_TRANSACTION_TYPE.PROPOSAL_FEE_REFUND:
      return CREDIT_TRANSACTION_TYPE.PROPOSAL_FEE;
    default:
      return CREDIT_TRANSACTION_TYPE.FUND_TRANSFER;
  }
}

async function lockDispute(client, disputeId, { skipLocked = false } = {}) {
  const result = await client.query(
    `
    SELECT *
    FROM disputes
    WHERE dispute_id = $1
      AND deleted_at IS NULL
    FOR UPDATE${skipLocked ? ' SKIP LOCKED' : ''}
    `,
    [disputeId]
  );
  return result.rows[0] || null;
}

// Same calculation the dispute freeze stores in `credit_amount_involved`.
async function remainingEscrowCredits(client, disputeId, contractId) {
  return remainingContractEscrowCredits(client, { disputeId, contractId });
}

/**
 * Escrow a dispute still holds for its contract: what must be settled (or knowingly left with
 * the contract) before the case may close. 0 when there is no contract, the case is
 * conduct-only (filed after the contract ended), or a money ruling already decided it.
 * @param {{ dispute_id: string, contract_id?: string|null, contract_ended_at_filing?: boolean,
 *   financial_resolution_at?: Date|null }} dispute
 */
async function pendingDisputeEscrow(dispute, db = pool) {
  if (!dispute?.dispute_id || !dispute.contract_id) return 0;
  if (dispute.contract_ended_at_filing || dispute.financial_resolution_at) return 0;
  return Math.max(0, await remainingEscrowCredits(db, dispute.dispute_id, dispute.contract_id));
}

async function loadContractParties(client, contractId) {
  const result = await client.query(
    `
    SELECT
      c.contract_id,
      c.status,
      COALESCE(jc_info.client_account_id, gc_info.client_account_id) AS client_account_id,
      COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id
    FROM contracts c
    LEFT JOIN (
      SELECT jc.contract_id, j.client_account_id, p.freelancer_account_id
      FROM job_contracts jc
      JOIN proposals p ON jc.proposal_id = p.proposal_id
      JOIN jobs j ON p.job_id = j.job_id
    ) jc_info ON c.contract_id = jc_info.contract_id
    LEFT JOIN (
      SELECT gc.contract_id, gr.client_account_id, g.freelancer_account_id
      FROM gig_contracts gc
      JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
      JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
      JOIN gigs g ON gt.gig_id = g.gig_id
    ) gc_info ON c.contract_id = gc_info.contract_id
    WHERE c.contract_id = $1
    FOR UPDATE OF c
    `,
    [contractId]
  );
  return result.rows[0] || null;
}

function partyRole(parties, accountId) {
  if (!parties || !accountId) return null;
  if (String(parties.client_account_id) === String(accountId)) return 'client';
  if (String(parties.freelancer_account_id) === String(accountId)) return 'freelancer';
  return null;
}

/** Lock wallets in id order (so two rulings never deadlock) and return them keyed by id. */
async function lockWalletsById(client, walletIds) {
  const ids = [...new Set((walletIds || []).filter(Boolean).map(String))].sort();
  if (!ids.length) return new Map();
  const result = await client.query(
    `
    SELECT w.wallet_id, w.type, w.status, w.balance_credits, aw.account_id
    FROM wallets w
    LEFT JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
    WHERE w.wallet_id = ANY($1::uuid[])
    ORDER BY w.wallet_id
    FOR UPDATE OF w
    `,
    [ids]
  );
  return new Map(result.rows.map((row) => [String(row.wallet_id), row]));
}

/** An account's wallet of one type (account or escrow), or null. */
async function findAccountWallet(client, accountId, type) {
  if (!accountId) return null;
  const result = await client.query(
    `
    SELECT w.wallet_id, w.type, w.status, w.balance_credits, aw.account_id
    FROM account_wallets aw
    JOIN wallets w ON w.wallet_id = aw.wallet_id
    WHERE aw.account_id = $1 AND w.type = $2
    ORDER BY (w.status = 'active') DESC, w.wallet_id
    LIMIT 1
    `,
    [accountId, type]
  );
  return result.rows[0] || null;
}

async function insertLedger(client, {
  type,
  amount,
  sourceWalletId,
  destinationWalletId,
  referenceTable = null,
  referenceId = null,
  relatedDisputeId = null,
  reversesCreditTransactionId = null,
}) {
  const result = await client.query(
    `
    INSERT INTO credit_transactions (
      type,
      amount_credits,
      status,
      source_wallet_id,
      destination_wallet_id,
      reference_table,
      reference_id,
      related_dispute_id,
      reverses_credit_transaction_id
    ) VALUES (
      $1, $2, 'Completed', $3, $4, $5, $6, $7, $8
    )
    RETURNING credit_transaction_id, type, amount_credits, status
    `,
    [
      type,
      amount,
      sourceWalletId,
      destinationWalletId,
      referenceTable,
      referenceId,
      relatedDisputeId,
      reversesCreditTransactionId,
    ]
  );
  return result.rows[0];
}

/** Move credits between two locked wallets. Throws (nothing moves) when the source is short. */
async function moveCredits(client, { amount, sourceWalletId, destinationWalletId, shortMessage, shortCode }) {
  const debit = await client.query(
    `
    UPDATE wallets
    SET balance_credits = balance_credits - $1
    WHERE wallet_id = $2
      AND balance_credits >= $1
    RETURNING wallet_id
    `,
    [amount, sourceWalletId]
  );
  if (!debit.rows.length) throw domainError(shortMessage, 409, shortCode);
  await client.query(
    `UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2`,
    [amount, destinationWalletId]
  );
}

async function closeDisputeFinancial(client, {
  disputeId,
  staffId,
  kind,
  resolutionNotes,
  clientCredits = 0,
  freelancerCredits = 0,
  reversedTransactionId = null,
  resolutionOutcome = null,
}) {
  await client.query(
    `
    UPDATE disputes
    SET status = 'closed',
        resolution_notes = $2,
        credit_amount_involved = 0,
        resolved_at = COALESCE(resolved_at, NOW()),
        financial_resolution_at = NOW(),
        financial_resolution_kind = $3,
        financial_resolution_staff_id = $4,
        financial_client_credits = $5,
        financial_freelancer_credits = $6,
        financial_reversed_transaction_id = $7,
        resolution_outcome = $8,
        updated_at = NOW()
    WHERE dispute_id = $1
    `,
    [
      disputeId,
      resolutionNotes,
      kind,
      staffId,
      clientCredits,
      freelancerCredits,
      reversedTransactionId,
      resolutionOutcome,
    ]
  );
}

/**
 * Credits of approved milestones still in this contract's escrow, capped at what escrow holds.
 * They belong to the freelancer in every settlement (see `loadSettlementMilestones`).
 */
async function approvedMilestoneFloor(client, contractId, remaining) {
  const result = await client.query(
    `
    SELECT cm.status, cm.credits, ${milestonePaidOutSql('cm')} AS paid_out
    FROM contract_milestones cm
    WHERE cm.contract_id = $1
    FOR UPDATE OF cm
    `,
    [contractId]
  );
  const approvedTotal = result.rows.reduce(
    (sum, m) =>
      milestoneEscrowState({ status: m.status, paidOut: m.paid_out }) === 'approved'
        ? sum + Math.max(0, Number(m.credits || 0))
        : sum,
    0
  );
  return Math.min(remaining, approvedTotal);
}

async function insertPayout(client, payout) {
  const result = await client.query(
    `
    INSERT INTO dispute_payouts (
      dispute_id, kind, recipient_account_id, recipient_role, amount_credits,
      source_wallet_id, destination_wallet_id, transaction_type, reference_table, reference_id,
      reverses_credit_transaction_id, hold_credit_transaction_id, status, release_at,
      created_by_staff_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'scheduled', $13, $14
    )
    RETURNING *
    `,
    [
      payout.disputeId,
      payout.kind,
      payout.recipientAccountId || null,
      payout.recipientRole || null,
      payout.amount,
      payout.sourceWalletId,
      payout.destinationWalletId,
      payout.transactionType,
      payout.referenceTable || null,
      payout.referenceId || null,
      payout.reversesCreditTransactionId || null,
      payout.holdCreditTransactionId || null,
      payout.releaseAt,
      payout.staffId || null,
    ]
  );
  return result.rows[0];
}

/**
 * Pay one locked payout row: move the credits out of the holding wallet, write the ledger
 * row, mark a reversed original `Reversed`, and mark the payout paid. Throws on any shortfall
 * so the caller's transaction rolls back with nothing half-moved.
 */
async function releasePayout(client, payout, { staffId = null } = {}) {
  const amount = Number(payout.amount_credits || 0);
  const wallets = await lockWalletsById(client, [payout.source_wallet_id, payout.destination_wallet_id]);
  const source = wallets.get(String(payout.source_wallet_id));
  const destination = wallets.get(String(payout.destination_wallet_id));
  if (!source || !destination || source.status !== 'active' || destination.status !== 'active') {
    throw domainError(
      'A wallet on this payout is missing or inactive, so the credits cannot move.',
      409,
      'PAYOUT_WALLET_INACTIVE'
    );
  }

  await moveCredits(client, {
    amount,
    sourceWalletId: source.wallet_id,
    destinationWalletId: destination.wallet_id,
    shortMessage: 'The wallet holding these credits no longer has enough for this payout.',
    shortCode: 'PAYOUT_INSUFFICIENT',
  });

  const ledger = await insertLedger(client, {
    type: payout.transaction_type,
    amount,
    sourceWalletId: source.wallet_id,
    destinationWalletId: destination.wallet_id,
    referenceTable: payout.reference_table || null,
    referenceId: payout.reference_id || null,
    relatedDisputeId: payout.dispute_id,
    reversesCreditTransactionId: payout.reverses_credit_transaction_id || null,
  });

  if (payout.reverses_credit_transaction_id) {
    await client.query(
      `UPDATE credit_transactions SET status = 'Reversed'
       WHERE credit_transaction_id = $1 AND status = 'Completed'`,
      [payout.reverses_credit_transaction_id]
    );
  }

  const updated = await client.query(
    `
    UPDATE dispute_payouts
    SET status = 'paid',
        paid_at = NOW(),
        credit_transaction_id = $2,
        released_by_staff_id = $3,
        attempts = attempts + 1,
        last_attempt_at = NOW(),
        failure_reason = NULL,
        updated_at = NOW()
    WHERE dispute_payout_id = $1
    RETURNING *
    `,
    [payout.dispute_payout_id, ledger.credit_transaction_id, staffId]
  );
  return updated.rows[0];
}

/**
 * End a contract when an escrow settlement is ruled: the ruling decides the contract, and the
 * payout date only decides when the credits move. Unfinished milestones are cancelled, the gig
 * order is cancelled and team workspaces are archived, so no more work, release or refund can
 * happen on it. Escrow stays frozen until the payouts are paid (see the escrow guards).
 *
 * What changed is kept in `contracts.dispute_settlement_end`, so withdrawing the ruling
 * (`restoreContractAfterWithdrawnSettlement`) puts the contract back exactly as it was.
 * `dispute_hold_since` is left as it is: a restored contract is still on hold under the reopened case.
 * Before migration 1829900000000 the snapshot column is missing; the contract still ends.
 */
async function endContractAfterSettlement(client, contractId, { disputeId = null } = {}) {
  if (!contractId) return null;

  const contract = await client.query(
    `SELECT contract_id, status FROM contracts WHERE contract_id = $1 FOR UPDATE`,
    [contractId]
  );
  const current = contract.rows[0];
  if (!current) return null;
  if (isContractEnded(current.status)) {
    return { contractStatus: current.status, cancelledMilestones: 0, alreadyEnded: true };
  }

  const completed = await client.query(
    `SELECT COUNT(*)::int AS n FROM contract_milestones WHERE contract_id = $1 AND status = 'completed'`,
    [contractId]
  );
  const cancelled = await client.query(
    `
    UPDATE contract_milestones cm
    SET status = 'cancelled'
    FROM contract_milestones prev
    WHERE cm.contract_milestone_id = prev.contract_milestone_id
      AND cm.contract_id = $1
      AND cm.status NOT IN ('completed', 'cancelled', 'abandoned')
    RETURNING cm.contract_milestone_id AS id, prev.status AS previous_status
    `,
    [contractId]
  );
  const contractStatus = Number(completed.rows[0]?.n || 0) > 0 ? 'Closed' : 'Cancelled';
  await client.query(`UPDATE contracts SET status = $1 WHERE contract_id = $2`, [
    contractStatus,
    contractId,
  ]);
  const gigRequests = await client.query(
    `
    UPDATE gig_requests gr
    SET status = 'Cancelled', updated_at = NOW()
    FROM gig_requests prev
    WHERE gr.gig_request_id = prev.gig_request_id
      AND gr.gig_request_id IN (SELECT gig_request_id FROM gig_contracts WHERE contract_id = $1)
      AND gr.status IS DISTINCT FROM 'Cancelled'
    RETURNING gr.gig_request_id AS id, prev.status AS previous_status
    `,
    [contractId]
  );

  // A pending mutual cancellation request is moot once the ruling ends the contract.
  const withdrawnRequests = await client.query(
    `
    UPDATE contract_cancellation_requests
    SET status = 'withdrawn', responded_at = NOW()
    WHERE contract_id = $1 AND status = 'pending'
    RETURNING request_id
    `,
    [contractId]
  );

  // Team workspaces this end archives (and only those) are un-archived if the ruling is withdrawn.
  const liveTeams = await client.query(
    `
    SELECT DISTINCT t.team_id
    FROM team_contract_workspaces tcw
    JOIN teams t ON t.team_id = tcw.team_id
    WHERE tcw.contract_id = $1
      AND t.is_archived = FALSE
    `,
    [contractId]
  );
  const TeamProjectRepositories = require('./TeamProjectRepositories');
  await TeamProjectRepositories.syncContractWorkspacesArchived(
    client,
    contractId,
    null,
    'Contract ended by a dispute settlement'
  );
  const archivedTeams = liveTeams.rows.length
    ? await client.query(
      `SELECT team_id FROM teams WHERE team_id = ANY($1::uuid[]) AND is_archived = TRUE`,
      [liveTeams.rows.map((row) => row.team_id)]
    )
    : { rows: [] };

  const snapshot = {
    disputeId: disputeId ? String(disputeId) : null,
    endedAt: new Date().toISOString(),
    contractStatus: current.status,
    endedStatus: contractStatus,
    milestones: cancelled.rows.map((row) => ({ id: row.id, status: row.previous_status })),
    gigRequests: gigRequests.rows.map((row) => ({ id: row.id, status: row.previous_status })),
    archivedTeamIds: archivedTeams.rows.map((row) => row.team_id),
    cancellationRequestIds: withdrawnRequests.rows.map((row) => row.request_id),
  };
  // A savepoint keeps a missing column (migration not run yet) from aborting the transaction.
  await client.query('SAVEPOINT dispute_settlement_snapshot');
  try {
    await client.query(
      `UPDATE contracts SET dispute_settlement_end = $2::jsonb WHERE contract_id = $1`,
      [contractId, JSON.stringify(snapshot)]
    );
    await client.query('RELEASE SAVEPOINT dispute_settlement_snapshot');
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT dispute_settlement_snapshot');
    if (error.code !== '42703') throw error;
  }

  return { contractStatus, cancelledMilestones: cancelled.rowCount || 0, alreadyEnded: false };
}

/** End, in its own transaction, a live contract whose settlement ruling still stands. */
async function endContractForStandingSettlement(contractId, disputeId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await endContractAfterSettlement(client, contractId, { disputeId });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Undo `endContractAfterSettlement` when that settlement ruling is withdrawn: the contract,
 * its milestones and its gig order go back to what they were, and the workspaces it archived
 * are un-archived. Only rows still in the state the settlement left are restored. The case has
 * been reopened, so the contract comes back on hold until the case is decided again.
 */
async function restoreContractAfterWithdrawnSettlement(client, contractId, disputeId) {
  if (!contractId) return null;
  let res;
  await client.query('SAVEPOINT dispute_settlement_restore');
  try {
    res = await client.query(
      `SELECT status, dispute_settlement_end FROM contracts WHERE contract_id = $1 FOR UPDATE`,
      [contractId]
    );
    await client.query('RELEASE SAVEPOINT dispute_settlement_restore');
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT dispute_settlement_restore');
    if (error.code === '42703') return null;
    throw error;
  }
  const row = res.rows[0];
  const snapshot = row?.dispute_settlement_end;
  if (!snapshot || String(snapshot.disputeId || '') !== String(disputeId)) return null;
  if (String(row.status || '') !== String(snapshot.endedStatus || '')) {
    // Something else changed the contract since; leave it and just drop the snapshot.
    await client.query(`UPDATE contracts SET dispute_settlement_end = NULL WHERE contract_id = $1`, [contractId]);
    return { restored: false };
  }

  await client.query(
    `UPDATE contracts SET status = $2, dispute_settlement_end = NULL WHERE contract_id = $1`,
    [contractId, snapshot.contractStatus]
  );
  for (const milestone of snapshot.milestones || []) {
    await client.query(
      `UPDATE contract_milestones SET status = $3
       WHERE contract_milestone_id = $1 AND contract_id = $2 AND status = 'cancelled'`,
      [milestone.id, contractId, milestone.status]
    );
  }
  for (const request of snapshot.gigRequests || []) {
    await client.query(
      `UPDATE gig_requests SET status = $2, updated_at = NOW()
       WHERE gig_request_id = $1 AND status = 'Cancelled'`,
      [request.id, request.status]
    );
  }
  if ((snapshot.archivedTeamIds || []).length) {
    await client.query(
      `UPDATE teams SET is_archived = FALSE, archived_at = NULL
       WHERE team_id = ANY($1::uuid[]) AND is_archived = TRUE`,
      [snapshot.archivedTeamIds]
    );
  }
  if ((snapshot.cancellationRequestIds || []).length) {
    await client.query(
      `UPDATE contract_cancellation_requests SET status = 'pending', responded_at = NULL
       WHERE request_id = ANY($1::uuid[]) AND status = 'withdrawn'`,
      [snapshot.cancellationRequestIds]
    );
  }
  return {
    restored: true,
    contractStatus: snapshot.contractStatus,
    restoredMilestones: (snapshot.milestones || []).length,
  };
}

async function assertNoWaitingPayouts(client, disputeId) {
  const waiting = await client.query(
    `SELECT 1 FROM dispute_payouts WHERE dispute_id = $1 AND status = ANY($2::text[]) LIMIT 1`,
    [disputeId, WAITING_PAYOUT_STATUSES]
  );
  if (waiting.rows.length) {
    throw domainError('This dispute already has a payout waiting.', 409, 'ALREADY_RESOLVED');
  }
}

function milestoneLabel(milestone) {
  return `${milestone.index ? `${milestone.index}. ` : ''}${milestone.name || 'Milestone'}`;
}

/**
 * The milestones the freelancer is paid for, checked against the contract while it is locked.
 *
 * Approved milestones belong to the freelancer: their credits are never refunded to the client.
 * Those still in escrow are always part of the freelancer's share, whatever the split method,
 * and those already paid out can't be picked (their credits have left escrow).
 * `milestones` pays exactly approved + picked milestones; `both` pays them plus an extra amount;
 * `amount` only has to cover the approved ones.
 */
async function loadSettlementMilestones(client, {
  contractId,
  milestoneIds,
  splitMethod,
  freelancerCredits,
  remaining,
}) {
  if (!SETTLEMENT_SPLIT_METHODS.includes(splitMethod)) {
    throw domainError('splitMethod must be amount, milestones or both.', 400);
  }

  const result = await client.query(
    `
    SELECT cm.contract_milestone_id, cm.index, cm.name, cm.status, cm.credits,
           ${milestonePaidOutSql('cm')} AS paid_out
    FROM contract_milestones cm
    WHERE cm.contract_id = $1
    ORDER BY cm.index ASC
    FOR UPDATE OF cm
    `,
    [contractId]
  );
  const all = result.rows.map((m) => ({
    id: String(m.contract_milestone_id),
    index: Number(m.index || 0),
    name: m.name,
    status: String(m.status || '').toLowerCase(),
    credits: Number(m.credits || 0),
    state: milestoneEscrowState({ status: m.status, paidOut: m.paid_out }),
  }));
  const byId = new Map(all.map((m) => [m.id, m]));

  const approved = all.filter((m) => m.state === 'approved' && m.credits > 0);
  const approvedTotal = approved.reduce((sum, m) => sum + m.credits, 0);
  const approvedFloor = Math.min(remaining, approvedTotal);
  if (freelancerCredits < approvedFloor) {
    throw domainError(
      `${approved.map(milestoneLabel).join(', ')} ${approved.length === 1 ? 'was' : 'were'} approved, so ${approvedFloor.toLocaleString()} credits belong to the freelancer and can't be refunded to the client.`,
      400,
      'APPROVED_MILESTONE_NOT_REFUNDABLE'
    );
  }

  const picked = new Map(approved.map((m) => [m.id, m]));
  if (splitMethod !== 'amount') {
    for (const id of milestoneIds) {
      const milestone = byId.get(id);
      if (!milestone) {
        throw domainError('A picked milestone is not on this contract.', 400, 'MILESTONE_NOT_ON_CONTRACT');
      }
      if (milestone.state === 'paid' || milestone.state === 'closed') {
        throw domainError(
          milestone.state === 'paid'
            ? `Milestone "${milestone.name}" is already paid out, so its credits are no longer in escrow.`
            : `Milestone "${milestone.name}" is already ${milestone.status}, so its credits are no longer in escrow.`,
          409,
          'MILESTONE_ALREADY_SETTLED'
        );
      }
      picked.set(id, milestone);
    }
  }

  const milestones = [...picked.values()]
    .sort((a, b) => a.index - b.index)
    .map(({ id, index, name, credits, state }) => ({ id, index, name, credits, approved: state === 'approved' }));
  if (splitMethod === 'amount') return milestones;

  const milestoneTotal = milestones.reduce((sum, m) => sum + m.credits, 0);
  if (milestoneTotal > remaining) {
    throw domainError(
      `The picked milestones add up to ${milestoneTotal.toLocaleString()} credits, but escrow only holds ${remaining.toLocaleString()}. Pick fewer, or split by amount.`,
      400,
      'MILESTONES_EXCEED_ESCROW'
    );
  }
  if (splitMethod === 'milestones' && freelancerCredits !== milestoneTotal) {
    throw domainError(
      `The freelancer's share must equal the picked milestones (${milestoneTotal.toLocaleString()} credits).`,
      400,
      'SETTLEMENT_MILESTONE_MISMATCH'
    );
  }
  if (splitMethod === 'both' && freelancerCredits < milestoneTotal) {
    throw domainError(
      `The freelancer's share can't be less than the picked milestones (${milestoneTotal.toLocaleString()} credits).`,
      400,
      'SETTLEMENT_MILESTONE_MISMATCH'
    );
  }
  return milestones;
}

/**
 * Settle a contract dispute's frozen escrow between the client and the freelancer.
 * Every remaining credit must be allocated, so nothing is left stranded in escrow.
 * Staff split it by amount, by picking the milestones the freelancer is paid for, or both.
 */
/**
 * Settle a dispute's frozen escrow and close the case.
 * `awardToDisputer`: ignore the given split and send every credit to the disputer's side of the
 * contract (the disputee would not take part). Approved milestones still go to the freelancer.
 * `resolutionOutcome`: the DisputeResolutions key recorded with the ruling, if any.
 */
async function settleEscrow({
  disputeId,
  staffId,
  clientCredits: requestedClientCredits,
  freelancerCredits: requestedFreelancerCredits,
  resolutionNotes,
  releaseAt,
  immediate = false,
  splitMethod: requestedSplitMethod = 'amount',
  milestoneIds: requestedMilestoneIds = [],
  awardToDisputer = false,
  resolutionOutcome = null,
}) {
  let clientCredits = requestedClientCredits;
  let freelancerCredits = requestedFreelancerCredits;
  let splitMethod = requestedSplitMethod;
  let milestoneIds = requestedMilestoneIds;
  let awardedRole = null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dispute = await lockDispute(client, disputeId);
    if (!dispute) throw domainError('Dispute not found', 404);
    if (dispute.financial_resolution_at) {
      throw domainError('This dispute already has a financial resolution.', 409, 'ALREADY_RESOLVED');
    }
    if (String(dispute.status || '').toLowerCase() === 'closed') {
      throw domainError('Reopen the dispute before settling escrow.', 409, 'DISPUTE_CLOSED');
    }
    if (!dispute.contract_id) {
      throw domainError('Escrow settle requires a linked contract dispute.', 400);
    }
    await assertNoWaitingPayouts(client, disputeId);

    const parties = await loadContractParties(client, dispute.contract_id);
    if (!parties?.client_account_id || !parties?.freelancer_account_id) {
      throw domainError('Could not resolve contract parties for escrow settlement.', 400);
    }

    const remaining = await remainingEscrowCredits(client, disputeId, dispute.contract_id);
    if (remaining <= 0) {
      throw domainError(
        'No escrow credits remain on this contract. Record an outcome or reverse a transaction instead.',
        409,
        'NO_ESCROW'
      );
    }
    if (awardToDisputer) {
      // Worked out here, under the lock, so the split matches what escrow holds right now.
      awardedRole = partyRole(parties, dispute.by_account_id);
      if (!awardedRole) {
        throw domainError(
          'The disputer is neither the client nor the freelancer on this contract, so the escrow cannot go to them automatically. Split it by ruling instead.',
          409,
          'DISPUTER_NOT_A_PARTY'
        );
      }
      const floor = awardedRole === 'client'
        ? await approvedMilestoneFloor(client, dispute.contract_id, remaining)
        : remaining;
      freelancerCredits = floor;
      clientCredits = remaining - floor;
      splitMethod = 'amount';
      milestoneIds = [];
    }
    const total = clientCredits + freelancerCredits;
    if (total !== remaining) {
      throw domainError(
        `Split all ${remaining.toLocaleString()} escrow credits between the client and the freelancer (${total.toLocaleString()} assigned).`,
        400,
        'SETTLEMENT_MUST_BE_COMPLETE'
      );
    }

    const milestones = await loadSettlementMilestones(client, {
      contractId: dispute.contract_id,
      milestoneIds,
      splitMethod,
      freelancerCredits,
      remaining,
    });

    const holdings = await contractEscrowHoldings(client, {
      disputeId,
      contractId: dispute.contract_id,
    });
    const clientWallet = await findAccountWallet(client, parties.client_account_id, ACCOUNT_WALLET);
    const freelancerWallet = await findAccountWallet(client, parties.freelancer_account_id, ACCOUNT_WALLET);
    if (clientCredits > 0 && clientWallet?.status !== 'active') {
      throw domainError('Client account wallet not found or inactive.', 400);
    }
    if (freelancerCredits > 0 && freelancerWallet?.status !== 'active') {
      throw domainError('Freelancer account wallet not found or inactive.', 400);
    }

    // Lock every wallet the payouts will touch, then check the holding wallets really have
    // this contract's credits. A shortfall means the ledger and balances disagree.
    const locked = await lockWalletsById(client, [
      ...holdings.map((h) => h.walletId),
      clientWallet?.wallet_id,
      freelancerWallet?.wallet_id,
    ]);
    for (const holding of holdings) {
      const wallet = locked.get(holding.walletId);
      if (!wallet || wallet.status !== 'active' || Number(wallet.balance_credits) < holding.held) {
        throw domainError(
          'An escrow wallet holds less than this contract’s credits. Check the ledger before settling.',
          409,
          'INSUFFICIENT_ESCROW'
        );
      }
    }

    // Take each share from the holding wallets in turn; a share can span two wallets.
    const queue = holdings.map((h) => ({ ...h, left: h.held }));
    const plan = [];
    const take = (amount, share) => {
      let need = amount;
      for (const holding of queue) {
        if (need <= 0) break;
        const use = Math.min(holding.left, need);
        if (use <= 0) continue;
        plan.push({ ...share, amount: use, sourceWalletId: holding.walletId });
        holding.left -= use;
        need -= use;
      }
      if (need > 0) {
        throw domainError(
          'The escrow wallets hold less than the amount to settle. Check the ledger before settling.',
          409,
          'INSUFFICIENT_ESCROW'
        );
      }
    };
    if (clientCredits > 0) {
      take(clientCredits, {
        kind: 'escrow_refund',
        recipientAccountId: parties.client_account_id,
        recipientRole: 'client',
        destinationWalletId: clientWallet.wallet_id,
        transactionType: CREDIT_TRANSACTION_TYPE.ESCROW_REFUND,
      });
    }
    if (freelancerCredits > 0) {
      take(freelancerCredits, {
        kind: 'escrow_release',
        recipientAccountId: parties.freelancer_account_id,
        recipientRole: 'freelancer',
        destinationWalletId: freelancerWallet.wallet_id,
        transactionType: CREDIT_TRANSACTION_TYPE.ESCROW_RELEASE,
      });
    }

    let payouts = [];
    for (const item of plan) {
      payouts.push(
        await insertPayout(client, {
          ...item,
          disputeId,
          referenceTable: 'contracts',
          referenceId: dispute.contract_id,
          releaseAt: immediate ? new Date() : releaseAt,
          staffId,
        })
      );
    }

    await closeDisputeFinancial(client, {
      disputeId,
      staffId,
      kind: 'escrow_settle',
      resolutionNotes,
      clientCredits,
      freelancerCredits,
      resolutionOutcome,
    });

    if (immediate) {
      const paid = [];
      for (const payout of payouts) paid.push(await releasePayout(client, payout, { staffId }));
      payouts = paid;
    }
    // The ruling decides the contract: it ends now, whenever the credits are paid.
    const contractEnd = await endContractAfterSettlement(client, dispute.contract_id, { disputeId });

    await commitOrThrow(client);
    return {
      kind: 'escrow_settle',
      clientCredits,
      freelancerCredits,
      awardedRole,
      resolutionOutcome,
      splitMethod,
      milestones,
      immediate,
      releaseAt: immediate ? null : releaseAt,
      contractId: dispute.contract_id,
      contractEnd,
      payouts,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function assertTxnLinkedToDispute(client, dispute, txn) {
  if (String(txn.related_dispute_id || '') === String(dispute.dispute_id)) return true;
  if (
    dispute.related_credit_transaction_id &&
    String(txn.credit_transaction_id) === String(dispute.related_credit_transaction_id)
  ) {
    return true;
  }

  if (dispute.contract_id) {
    if (
      txn.reference_table === 'contracts' &&
      String(txn.reference_id) === String(dispute.contract_id)
    ) {
      return true;
    }
    if (['contract_milestones', 'contract_milestone_revisions'].includes(txn.reference_table)) {
      const milestone = await client.query(
        `
        SELECT 1
        FROM contract_milestones
        WHERE contract_milestone_id = $1
          AND contract_id = $2
        LIMIT 1
        `,
        [txn.reference_id, dispute.contract_id]
      );
      if (milestone.rows.length) return true;
    }
  }

  return false;
}

/**
 * Who a reversal takes credits from and who it pays, or why it is not allowed.
 * Shared by the ruling itself and the case file, so the console shows the same routing the
 * server will apply.
 *
 *  - Credits still in escrow (the original landed in an escrow wallet) are not reversible:
 *    Settle escrow handles them, and ends the contract so they cannot be paid twice.
 *  - Credits paid out of escrow (a milestone release, a refund) go to the other contract
 *    party: reversing a freelancer's payout refunds the client, and the other way round.
 *    Sending them back into escrow would strand them there.
 *  - Anything else goes back to the wallet it came from.
 */
function planReversalRoute({ source, destination, parties, hasContract }) {
  if (!source || !destination) {
    return { allowed: false, reason: 'The wallets on this transaction are missing.' };
  }
  if (destination.type === ESCROW_WALLET) {
    return {
      allowed: false,
      reason: 'These credits are still in escrow. Use Settle escrow to split what the contract holds.',
    };
  }
  if (source.type === ESCROW_WALLET) {
    if (!hasContract || !parties) {
      return {
        allowed: false,
        reason: 'These credits came out of escrow. Reversing them would lock them back in escrow with no way out.',
      };
    }
    const fromRole = partyRole(parties, destination.account_id);
    if (!fromRole) {
      return {
        allowed: false,
        reason: 'Only escrow payouts made to the client or the freelancer can be reversed.',
      };
    }
    return {
      allowed: true,
      fromAccountId: destination.account_id,
      fromRole,
      recipientAccountId: fromRole === 'client' ? parties.freelancer_account_id : parties.client_account_id,
      recipientRole: fromRole === 'client' ? 'freelancer' : 'client',
      recipientWalletType: ACCOUNT_WALLET,
      recipientWalletId: null,
    };
  }
  return {
    allowed: true,
    fromAccountId: destination.account_id || null,
    fromRole: partyRole(parties, destination.account_id),
    recipientAccountId: source.account_id || null,
    recipientRole: partyRole(parties, source.account_id),
    recipientWalletType: source.type,
    recipientWalletId: source.wallet_id,
  };
}

async function reverseTransaction({
  disputeId,
  staffId,
  creditTransactionId,
  amount,
  resolutionNotes,
  releaseAt,
  immediate = false,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dispute = await lockDispute(client, disputeId);
    if (!dispute) throw domainError('Dispute not found', 404);
    if (dispute.financial_resolution_at) {
      throw domainError('This dispute already has a financial resolution.', 409, 'ALREADY_RESOLVED');
    }
    if (String(dispute.status || '').toLowerCase() === 'closed') {
      throw domainError('Reopen the dispute before reversing a transaction.', 409, 'DISPUTE_CLOSED');
    }
    await assertNoWaitingPayouts(client, disputeId);

    const txnResult = await client.query(
      `
      SELECT *
      FROM credit_transactions
      WHERE credit_transaction_id = $1
      FOR UPDATE
      `,
      [creditTransactionId]
    );
    const original = txnResult.rows[0];
    if (!original) throw domainError('Credit transaction not found.', 404);
    if (String(original.status) !== CREDIT_TRANSACTION_STATUS.COMPLETED) {
      throw domainError('Only completed transactions can be reversed.', 409, 'NOT_REVERSIBLE');
    }

    const existingReverse = await client.query(
      `
      SELECT credit_transaction_id
      FROM credit_transactions
      WHERE reverses_credit_transaction_id = $1
        AND status IN ('Completed', 'Pending')
      UNION ALL
      SELECT credit_transaction_id
      FROM dispute_payouts
      WHERE reverses_credit_transaction_id = $1
        AND status = ANY($2::text[])
      LIMIT 1
      `,
      [creditTransactionId, WAITING_PAYOUT_STATUSES]
    );
    if (existingReverse.rows.length) {
      throw domainError('This transaction has already been reversed.', 409, 'ALREADY_REVERSED');
    }

    const linked = await assertTxnLinkedToDispute(client, dispute, original);
    if (!linked) {
      throw domainError('That transaction is not part of this dispute case file.', 400);
    }

    const originalAmount = Number(original.amount_credits || 0);
    const reverseAmount = amount == null ? originalAmount : Number(amount);
    if (!Number.isInteger(reverseAmount) || reverseAmount < 1 || reverseAmount > originalAmount) {
      throw domainError(
        `Reverse amount must be an integer between 1 and ${originalAmount}.`,
        400
      );
    }

    const parties = dispute.contract_id ? await loadContractParties(client, dispute.contract_id) : null;
    const originalWallets = await lockWalletsById(client, [
      original.source_wallet_id,
      original.destination_wallet_id,
    ]);
    const route = planReversalRoute({
      source: originalWallets.get(String(original.source_wallet_id)),
      destination: originalWallets.get(String(original.destination_wallet_id)),
      parties,
      hasContract: Boolean(dispute.contract_id),
    });
    if (!route.allowed) throw domainError(route.reason, 409, 'NOT_REVERSIBLE');

    const recipientWallet = route.recipientWalletId
      ? originalWallets.get(String(route.recipientWalletId))
      : await findAccountWallet(client, route.recipientAccountId, route.recipientWalletType);
    if (!recipientWallet || recipientWallet.status !== 'active') {
      throw domainError('The wallet that should receive these credits is missing or inactive.', 400);
    }

    // Take the credits back now. They wait in the payer's own escrow wallet, so they cannot
    // be spent while the payout is scheduled. Wallets without an owner (platform) hold in place.
    const clawWallet = originalWallets.get(String(original.destination_wallet_id));
    const holdWallet = clawWallet.account_id
      ? await findAccountWallet(client, clawWallet.account_id, ESCROW_WALLET)
      : null;
    let holdTxn = null;
    let holdingWalletId = clawWallet.wallet_id;
    if (holdWallet && holdWallet.status === 'active') {
      await lockWalletsById(client, [holdWallet.wallet_id, recipientWallet.wallet_id]);
      await moveCredits(client, {
        amount: reverseAmount,
        sourceWalletId: clawWallet.wallet_id,
        destinationWalletId: holdWallet.wallet_id,
        shortMessage: 'Recipient no longer has enough spendable credits to reverse this transaction.',
        shortCode: 'INSUFFICIENT_BALANCE',
      });
      holdTxn = await insertLedger(client, {
        type: CREDIT_TRANSACTION_TYPE.ESCROW_HOLD,
        amount: reverseAmount,
        sourceWalletId: clawWallet.wallet_id,
        destinationWalletId: holdWallet.wallet_id,
        referenceTable: 'disputes',
        referenceId: disputeId,
        relatedDisputeId: disputeId,
      });
      holdingWalletId = holdWallet.wallet_id;
    } else if (Number(clawWallet.balance_credits) < reverseAmount) {
      throw domainError(
        'Recipient no longer has enough spendable credits to reverse this transaction.',
        409,
        'INSUFFICIENT_BALANCE'
      );
    }

    let payout = await insertPayout(client, {
      disputeId,
      kind: 'reversal',
      recipientAccountId: route.recipientAccountId,
      recipientRole: route.recipientRole,
      amount: reverseAmount,
      sourceWalletId: holdingWalletId,
      destinationWalletId: recipientWallet.wallet_id,
      transactionType: compensatingType(original.type),
      // The payout belongs to the dispute, not the contract: those credits already left the
      // contract's escrow when the original moved, so they must not count toward it again.
      referenceTable: 'disputes',
      referenceId: disputeId,
      reversesCreditTransactionId: original.credit_transaction_id,
      holdCreditTransactionId: holdTxn?.credit_transaction_id || null,
      releaseAt: immediate ? new Date() : releaseAt,
      staffId,
    });

    await closeDisputeFinancial(client, {
      disputeId,
      staffId,
      kind: 'transaction_reverse',
      resolutionNotes,
      clientCredits: route.recipientRole === 'client' ? reverseAmount : 0,
      freelancerCredits: route.recipientRole === 'freelancer' ? reverseAmount : 0,
      reversedTransactionId: original.credit_transaction_id,
    });

    if (immediate) payout = await releasePayout(client, payout, { staffId });

    await commitOrThrow(client);
    return {
      kind: 'transaction_reverse',
      reversedTransactionId: original.credit_transaction_id,
      reversedTransactionType: original.type,
      amount: reverseAmount,
      immediate,
      releaseAt: immediate ? null : releaseAt,
      fromAccountId: route.fromAccountId,
      fromRole: route.fromRole,
      recipientAccountId: route.recipientAccountId,
      recipientRole: route.recipientRole,
      payouts: [payout],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error && error.code === '23505') {
      throw domainError('This transaction has already been reversed.', 409, 'ALREADY_REVERSED');
    }
    throw error;
  } finally {
    client.release();
  }
}

async function lockWaitingPayouts(client, disputeId, { dueOnly = false } = {}) {
  const result = await client.query(
    `
    SELECT *
    FROM dispute_payouts
    WHERE dispute_id = $1
      AND status = ANY($2::text[])
      ${dueOnly ? 'AND release_at <= NOW()' : ''}
    ORDER BY created_at ASC, dispute_payout_id ASC
    FOR UPDATE${dueOnly ? ' SKIP LOCKED' : ''}
    `,
    [disputeId, WAITING_PAYOUT_STATUSES]
  );
  return result.rows;
}

/** Staff "Pay now": release every waiting payout on a dispute in one transaction. */
async function releaseDisputePayouts({ disputeId, staffId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dispute = await lockDispute(client, disputeId);
    if (!dispute) throw domainError('Dispute not found', 404);
    const waiting = await lockWaitingPayouts(client, disputeId);
    if (!waiting.length) throw domainError('No payout is waiting on this dispute.', 409, 'NO_PAYOUT');

    const paid = [];
    for (const payout of waiting) paid.push(await releasePayout(client, payout, { staffId }));
    // Normally already ended when the settlement was ruled; this covers older rulings.
    const contractEnd = paid.some((p) => SETTLEMENT_PAYOUT_KINDS.includes(p.kind))
      ? await endContractAfterSettlement(client, dispute.contract_id, { disputeId })
      : null;
    await client.query(`UPDATE disputes SET updated_at = NOW() WHERE dispute_id = $1`, [disputeId]);
    await commitOrThrow(client);
    return { paid, contractEnd };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Move the release date of every waiting payout on a dispute. */
async function rescheduleDisputePayouts({ disputeId, releaseAt }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dispute = await lockDispute(client, disputeId);
    if (!dispute) throw domainError('Dispute not found', 404);
    const result = await client.query(
      `
      UPDATE dispute_payouts
      SET release_at = $2,
          -- A failed payout gets a fresh try on the new date.
          status = 'scheduled',
          failure_reason = NULL,
          updated_at = NOW()
      WHERE dispute_id = $1
        AND status = ANY($3::text[])
      RETURNING *
      `,
      [disputeId, releaseAt, WAITING_PAYOUT_STATUSES]
    );
    if (!result.rows.length) throw domainError('No payout is waiting on this dispute.', 409, 'NO_PAYOUT');
    await client.query(`UPDATE disputes SET updated_at = NOW() WHERE dispute_id = $1`, [disputeId]);
    await commitOrThrow(client);
    return { payouts: result.rows };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Withdraw a money ruling that has not been paid yet (the case must be reopened first).
 * Settlement credits never left escrow, so nothing moves; credits a reversal took back are
 * returned to the wallet they were taken from. The dispute can then be decided again.
 */
async function cancelDisputePayouts({ disputeId, staffId, reason }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dispute = await lockDispute(client, disputeId);
    if (!dispute) throw domainError('Dispute not found', 404);
    if (String(dispute.status || '').toLowerCase() === 'closed') {
      throw domainError('Reopen the case before withdrawing its ruling.', 409, 'DISPUTE_CLOSED');
    }
    if (!dispute.financial_resolution_at) {
      throw domainError('This dispute has no money ruling to withdraw.', 409, 'NO_PAYOUT');
    }

    const all = await client.query(
      `SELECT * FROM dispute_payouts WHERE dispute_id = $1 AND status <> 'cancelled' FOR UPDATE`,
      [disputeId]
    );
    if (all.rows.some((p) => p.status === 'paid')) {
      throw domainError(
        'Part of this ruling has already been paid, so it cannot be withdrawn.',
        409,
        'PAYOUT_ALREADY_PAID'
      );
    }

    const returned = [];
    for (const payout of all.rows) {
      if (payout.hold_credit_transaction_id) {
        const hold = await client.query(
          `SELECT * FROM credit_transactions WHERE credit_transaction_id = $1 FOR UPDATE`,
          [payout.hold_credit_transaction_id]
        );
        const holdRow = hold.rows[0];
        if (holdRow) {
          await lockWalletsById(client, [payout.source_wallet_id, holdRow.source_wallet_id]);
          await moveCredits(client, {
            amount: Number(payout.amount_credits),
            sourceWalletId: payout.source_wallet_id,
            destinationWalletId: holdRow.source_wallet_id,
            shortMessage: 'The escrow wallet holding these credits is short, so they cannot be returned.',
            shortCode: 'INSUFFICIENT_ESCROW',
          });
          await insertLedger(client, {
            type: compensatingType(holdRow.type),
            amount: Number(payout.amount_credits),
            sourceWalletId: payout.source_wallet_id,
            destinationWalletId: holdRow.source_wallet_id,
            referenceTable: holdRow.reference_table,
            referenceId: holdRow.reference_id,
            relatedDisputeId: disputeId,
            reversesCreditTransactionId: holdRow.credit_transaction_id,
          });
          await client.query(
            `UPDATE credit_transactions SET status = 'Reversed' WHERE credit_transaction_id = $1`,
            [holdRow.credit_transaction_id]
          );
          returned.push({ ...payout, returnedToWalletId: holdRow.source_wallet_id });
        }
      }
    }

    const cancelled = await client.query(
      `
      UPDATE dispute_payouts
      SET status = 'cancelled',
          cancelled_at = NOW(),
          cancel_reason = $2,
          updated_at = NOW()
      WHERE dispute_id = $1
        AND status = ANY($3::text[])
      RETURNING *
      `,
      [disputeId, reason || null, WAITING_PAYOUT_STATUSES]
    );

    // A settlement ended the contract when it was ruled; withdrawing it brings the contract back.
    const contractRestore = dispute.financial_resolution_kind === 'escrow_settle' && dispute.contract_id
      ? await restoreContractAfterWithdrawnSettlement(client, dispute.contract_id, disputeId)
      : null;

    const remaining = dispute.contract_id
      ? await remainingEscrowCredits(client, disputeId, dispute.contract_id)
      : 0;
    await client.query(
      `
      UPDATE disputes
      SET financial_resolution_at = NULL,
          financial_resolution_kind = NULL,
          financial_resolution_staff_id = NULL,
          financial_client_credits = 0,
          financial_freelancer_credits = 0,
          financial_reversed_transaction_id = NULL,
          credit_amount_involved = $2,
          updated_at = NOW()
      WHERE dispute_id = $1
      `,
      [disputeId, remaining]
    );
    await commitOrThrow(client);
    return {
      cancelled: cancelled.rows,
      returned,
      staffId,
      kind: dispute.financial_resolution_kind,
      contractId: dispute.contract_id || null,
      contractRestore,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Background release of due payouts. Only closed cases pay out; a reopened case waits.
 * Each dispute is its own transaction, so one stuck payout never blocks another dispute.
 * A failure marks that dispute's due payouts `failed`; they retry hourly for a day, and staff
 * can release them by hand at any time.
 */
async function releaseDuePayouts({ limit = 25 } = {}) {
  const due = await pool.query(
    `
    SELECT DISTINCT p.dispute_id
    FROM dispute_payouts p
    JOIN disputes d ON d.dispute_id = p.dispute_id
    WHERE d.deleted_at IS NULL
      AND d.status = 'closed'
      AND p.release_at <= NOW()
      AND (
        p.status = 'scheduled'
        OR (
          p.status = 'failed'
          AND p.attempts < 24
          AND (p.last_attempt_at IS NULL OR p.last_attempt_at < NOW() - INTERVAL '1 hour')
        )
      )
    LIMIT $1
    `,
    [limit]
  );

  const results = [];
  for (const { dispute_id: disputeId } of due.rows) {
    const client = await pool.connect();
    let payouts = [];
    try {
      await client.query('BEGIN');
      const dispute = await lockDispute(client, disputeId, { skipLocked: true });
      if (!dispute || String(dispute.status || '').toLowerCase() !== 'closed') {
        await client.query('ROLLBACK');
        continue;
      }
      payouts = (await lockWaitingPayouts(client, disputeId, { dueOnly: true })).filter(
        (p) =>
          p.status === 'scheduled' ||
          !p.last_attempt_at ||
          Date.now() - new Date(p.last_attempt_at).getTime() >= 60 * 60 * 1000
      );
      if (!payouts.length) {
        await client.query('ROLLBACK');
        continue;
      }
      const paid = [];
      for (const payout of payouts) paid.push(await releasePayout(client, payout));
      // Normally already ended when the settlement was ruled; this covers older rulings.
      const contractEnd = paid.some((p) => SETTLEMENT_PAYOUT_KINDS.includes(p.kind))
        ? await endContractAfterSettlement(client, dispute.contract_id, { disputeId })
        : null;
      await client.query(`UPDATE disputes SET updated_at = NOW() WHERE dispute_id = $1`, [disputeId]);
      await commitOrThrow(client);
      results.push({ disputeId, paid, contractEnd });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      let firstFailure = false;
      if (payouts.length) {
        const marked = await pool.query(
          `
          UPDATE dispute_payouts
          SET status = 'failed',
              failure_reason = $2,
              attempts = attempts + 1,
              last_attempt_at = NOW(),
              updated_at = NOW()
          WHERE dispute_payout_id = ANY($1::uuid[])
          RETURNING attempts
          `,
          [payouts.map((p) => p.dispute_payout_id), String(error.message || 'Payout failed').slice(0, 500)]
        );
        firstFailure = marked.rows.some((row) => Number(row.attempts) === 1);
      }
      results.push({ disputeId, failed: payouts, error: error.message, firstFailure });
    } finally {
      client.release();
    }
  }
  return results;
}

/** Every payout on a dispute, with names and wallet labels for the staff console. */
async function listDisputePayouts(db, disputeId) {
  try {
    const result = await (db || pool).query(
      `
      SELECT
        p.*,
        COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name, ra.handle, 'Member') AS recipient_name,
        ra.handle AS recipient_handle,
        sw.type AS source_wallet_type,
        dw.type AS destination_wallet_type,
        COALESCE(sa.display_name, sa.handle) AS holder_name,
        sa.handle AS holder_handle
      FROM dispute_payouts p
      LEFT JOIN accounts ra ON ra.account_id = p.recipient_account_id
      LEFT JOIN users ru ON ru.account_id = ra.account_id
      LEFT JOIN wallets sw ON sw.wallet_id = p.source_wallet_id
      LEFT JOIN wallets dw ON dw.wallet_id = p.destination_wallet_id
      LEFT JOIN account_wallets saw ON saw.wallet_id = p.source_wallet_id
      LEFT JOIN accounts sa ON sa.account_id = saw.account_id
      WHERE p.dispute_id = $1
      ORDER BY p.created_at ASC, p.dispute_payout_id ASC
      `,
      [disputeId]
    );
    return result.rows;
  } catch (error) {
    // The payouts table arrives with a migration; until then a dispute simply has none.
    if (error.code === '42P01') return [];
    throw error;
  }
}

/** "@handle" (or display name) for each account id, for ruling messages and notices. */
async function loadAccountLabels(accountIds) {
  const ids = [...new Set((accountIds || []).filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const result = await pool.query(
    `
    SELECT a.account_id, a.handle, a.display_name, u.first_name, u.last_name
    FROM accounts a
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE a.account_id = ANY($1::uuid[])
    `,
    [ids]
  );
  return new Map(
    result.rows.map((row) => [
      String(row.account_id),
      row.handle
        ? `@${row.handle}`
        : row.display_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || 'A member',
    ])
  );
}

/** One credit transaction, for naming what a reversal undid. */
async function getCreditTransaction(creditTransactionId) {
  if (!creditTransactionId) return null;
  const result = await pool.query(
    `SELECT credit_transaction_id, type, amount_credits, reference_table, reference_id
     FROM credit_transactions WHERE credit_transaction_id = $1`,
    [creditTransactionId]
  );
  return result.rows[0] || null;
}

module.exports = {
  loadAccountLabels,
  getCreditTransaction,
  domainError,
  compensatingType,
  remainingEscrowCredits,
  pendingDisputeEscrow,
  planReversalRoute,
  settleEscrow,
  reverseTransaction,
  releaseDisputePayouts,
  rescheduleDisputePayouts,
  cancelDisputePayouts,
  releaseDuePayouts,
  listDisputePayouts,
  endContractAfterSettlement,
  endContractForStandingSettlement,
};
