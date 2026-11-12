const { pool } = require('../lib/Database');
const {
  CREDIT_TRANSACTION_TYPE,
  CREDIT_TRANSACTION_STATUS,
} = require('../lib/CreditTransactionEnums');
const { remainingContractEscrowCredits } = require('../lib/DisputeEscrow');

function domainError(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
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

async function lockDispute(client, disputeId) {
  const result = await client.query(
    `
    SELECT *
    FROM disputes
    WHERE dispute_id = $1
      AND deleted_at IS NULL
    FOR UPDATE
    `,
    [disputeId]
  );
  return result.rows[0] || null;
}

// Same calculation the dispute freeze stores in `credit_amount_involved`.
async function remainingEscrowCredits(client, disputeId, contractId) {
  return remainingContractEscrowCredits(client, { disputeId, contractId });
}

async function loadContractParties(client, contractId) {
  const result = await client.query(
    `
    SELECT
      c.contract_id,
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

async function lockPartyWallets(client, clientAccountId, freelancerAccountId) {
  const result = await client.query(
    `
    SELECT aw.account_id, w.wallet_id, w.type, w.balance_credits
    FROM account_wallets aw
    JOIN wallets w ON aw.wallet_id = w.wallet_id
    WHERE aw.account_id = ANY($1::uuid[])
      AND w.status = 'active'
      AND w.type IN ('escrow wallets', 'account wallets')
    FOR UPDATE OF w
    `,
    [[clientAccountId, freelancerAccountId]]
  );

  const freelancerEscrow = result.rows.find(
    (row) =>
      String(row.account_id) === String(freelancerAccountId) && row.type === 'escrow wallets'
  );
  const clientPersonal = result.rows.find(
    (row) =>
      String(row.account_id) === String(clientAccountId) && row.type === 'account wallets'
  );
  const freelancerPersonal = result.rows.find(
    (row) =>
      String(row.account_id) === String(freelancerAccountId) && row.type === 'account wallets'
  );

  return { freelancerEscrow, clientPersonal, freelancerPersonal };
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

async function closeDisputeFinancial(client, {
  disputeId,
  staffId,
  kind,
  resolutionNotes,
  clientCredits = 0,
  freelancerCredits = 0,
  reversedTransactionId = null,
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
    ]
  );
}

async function settleEscrow({
  disputeId,
  staffId,
  clientCredits,
  freelancerCredits,
  resolutionNotes,
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
      throw domainError('Reopen the dispute before settling escrow.', 409, 'DISPUTE_CLOSED');
    }
    if (!dispute.contract_id) {
      throw domainError('Escrow settle requires a linked contract dispute.', 400);
    }

    const remaining = await remainingEscrowCredits(client, disputeId, dispute.contract_id);
    const total = clientCredits + freelancerCredits;
    if (total <= 0) {
      throw domainError('Assign at least one credit to the client or freelancer.', 400);
    }
    if (total > remaining) {
      throw domainError(
        `Only ${remaining.toLocaleString()} escrow credits remain for this dispute.`,
        409,
        'INSUFFICIENT_ESCROW'
      );
    }

    const parties = await loadContractParties(client, dispute.contract_id);
    if (!parties?.client_account_id || !parties?.freelancer_account_id) {
      throw domainError('Could not resolve contract parties for escrow settlement.', 400);
    }

    const wallets = await lockPartyWallets(
      client,
      parties.client_account_id,
      parties.freelancer_account_id
    );
    if (!wallets.freelancerEscrow) throw domainError('Freelancer escrow wallet not found.', 400);
    if (clientCredits > 0 && !wallets.clientPersonal) {
      throw domainError('Client account wallet not found.', 400);
    }
    if (freelancerCredits > 0 && !wallets.freelancerPersonal) {
      throw domainError('Freelancer account wallet not found.', 400);
    }
    if (Number(wallets.freelancerEscrow.balance_credits) < total) {
      throw domainError(
        'Escrow wallet balance is lower than the settlement amount.',
        409,
        'INSUFFICIENT_ESCROW'
      );
    }

    const debit = await client.query(
      `
      UPDATE wallets
      SET balance_credits = balance_credits - $1
      WHERE wallet_id = $2
        AND balance_credits >= $1
      RETURNING wallet_id
      `,
      [total, wallets.freelancerEscrow.wallet_id]
    );
    if (!debit.rows.length) {
      throw domainError(
        'Escrow wallet balance is lower than the settlement amount.',
        409,
        'INSUFFICIENT_ESCROW'
      );
    }

    const created = [];

    if (clientCredits > 0) {
      await client.query(
        `UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2`,
        [clientCredits, wallets.clientPersonal.wallet_id]
      );
      created.push(
        await insertLedger(client, {
          type: CREDIT_TRANSACTION_TYPE.ESCROW_REFUND,
          amount: clientCredits,
          sourceWalletId: wallets.freelancerEscrow.wallet_id,
          destinationWalletId: wallets.clientPersonal.wallet_id,
          referenceTable: 'contracts',
          referenceId: dispute.contract_id,
          relatedDisputeId: disputeId,
        })
      );
    }

    if (freelancerCredits > 0) {
      await client.query(
        `UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2`,
        [freelancerCredits, wallets.freelancerPersonal.wallet_id]
      );
      created.push(
        await insertLedger(client, {
          type: CREDIT_TRANSACTION_TYPE.ESCROW_RELEASE,
          amount: freelancerCredits,
          sourceWalletId: wallets.freelancerEscrow.wallet_id,
          destinationWalletId: wallets.freelancerPersonal.wallet_id,
          referenceTable: 'contracts',
          referenceId: dispute.contract_id,
          relatedDisputeId: disputeId,
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
    });

    await client.query('COMMIT');
    return {
      kind: 'escrow_settle',
      clientCredits,
      freelancerCredits,
      transactions: created.map((row) => ({
        id: row.credit_transaction_id,
        type: row.type,
        amount: Number(row.amount_credits),
        status: row.status,
      })),
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
    if (txn.reference_table === 'contract_milestones') {
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

async function reverseTransaction({
  disputeId,
  staffId,
  creditTransactionId,
  amount,
  resolutionNotes,
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
      LIMIT 1
      `,
      [creditTransactionId]
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

    const wallets = await client.query(
      `
      SELECT wallet_id, balance_credits
      FROM wallets
      WHERE wallet_id = ANY($1::uuid[])
        AND status = 'active'
      FOR UPDATE
      `,
      [[original.source_wallet_id, original.destination_wallet_id]]
    );
    const source = wallets.rows.find(
      (row) => String(row.wallet_id) === String(original.source_wallet_id)
    );
    const destination = wallets.rows.find(
      (row) => String(row.wallet_id) === String(original.destination_wallet_id)
    );
    if (!source || !destination) {
      throw domainError('Original transaction wallets are missing or inactive.', 400);
    }

    const debit = await client.query(
      `
      UPDATE wallets
      SET balance_credits = balance_credits - $1
      WHERE wallet_id = $2
        AND balance_credits >= $1
      RETURNING wallet_id
      `,
      [reverseAmount, destination.wallet_id]
    );
    if (!debit.rows.length) {
      throw domainError(
        'Recipient no longer has enough spendable credits to reverse this transaction.',
        409,
        'INSUFFICIENT_BALANCE'
      );
    }

    await client.query(
      `UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2`,
      [reverseAmount, source.wallet_id]
    );

    const compensating = await insertLedger(client, {
      type: compensatingType(original.type),
      amount: reverseAmount,
      sourceWalletId: destination.wallet_id,
      destinationWalletId: source.wallet_id,
      referenceTable: original.reference_table || null,
      referenceId: original.reference_id || null,
      relatedDisputeId: disputeId,
      reversesCreditTransactionId: original.credit_transaction_id,
    });

    await client.query(
      `
      UPDATE credit_transactions
      SET status = 'Reversed'
      WHERE credit_transaction_id = $1
      `,
      [original.credit_transaction_id]
    );

    await closeDisputeFinancial(client, {
      disputeId,
      staffId,
      kind: 'transaction_reverse',
      resolutionNotes,
      clientCredits: 0,
      freelancerCredits: 0,
      reversedTransactionId: original.credit_transaction_id,
    });

    await client.query('COMMIT');
    return {
      kind: 'transaction_reverse',
      reversedTransactionId: original.credit_transaction_id,
      amount: reverseAmount,
      transactions: [
        {
          id: compensating.credit_transaction_id,
          type: compensating.type,
          amount: Number(compensating.amount_credits),
          status: compensating.status,
        },
      ],
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

module.exports = {
  domainError,
  compensatingType,
  remainingEscrowCredits,
  settleEscrow,
  reverseTransaction,
};
