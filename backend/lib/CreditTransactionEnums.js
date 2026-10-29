/**
 * CREDIT_TRANSACTION.type and status — canonical Title Case labels for Ensemble.
 * Keep in sync with PostgreSQL enums credit_transaction_type / credit_transaction_status.
 */

const CREDIT_TRANSACTION_TYPES = Object.freeze([
  'Fund Transfer',
  'Escrow Hold',
  'Escrow Release',
  'Escrow Refund',
  'Asset Purchase',
  'Asset Refund',
  'Fee',
  'Cashout',
  'Cashout Refund',
  'Job Posting Fee',
  'Job Posting Fee Refund',
  'Proposal Fee',
  'Proposal Fee Refund',
  'Service Posting Fee',
]);

const CREDIT_TRANSACTION_TYPE = Object.freeze({
  FUND_TRANSFER: 'Fund Transfer',
  ESCROW_HOLD: 'Escrow Hold',
  ESCROW_RELEASE: 'Escrow Release',
  ESCROW_REFUND: 'Escrow Refund',
  ASSET_PURCHASE: 'Asset Purchase',
  ASSET_REFUND: 'Asset Refund',
  FEE: 'Fee',
  CASHOUT: 'Cashout',
  CASHOUT_REFUND: 'Cashout Refund',
  JOB_POSTING_FEE: 'Job Posting Fee',
  JOB_POSTING_FEE_REFUND: 'Job Posting Fee Refund',
  PROPOSAL_FEE: 'Proposal Fee',
  PROPOSAL_FEE_REFUND: 'Proposal Fee Refund',
  SERVICE_POSTING_FEE: 'Service Posting Fee',
});

const CREDIT_TRANSACTION_STATUSES = Object.freeze([
  'Pending',
  'Completed',
  'Failed',
  'Reversed',
]);

const CREDIT_TRANSACTION_STATUS = Object.freeze({
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REVERSED: 'Reversed',
});

/** Map legacy / free-form labels onto the canonical catalog. */
const LEGACY_TYPE_MAP = Object.freeze({
  'dispute hold': CREDIT_TRANSACTION_TYPE.ESCROW_HOLD,
  'credit freeze': CREDIT_TRANSACTION_TYPE.ESCROW_HOLD,
  'credit unfreeze': CREDIT_TRANSACTION_TYPE.ESCROW_RELEASE,
  'credit adjustment': CREDIT_TRANSACTION_TYPE.FUND_TRANSFER,
  'admin credit grant': CREDIT_TRANSACTION_TYPE.FUND_TRANSFER,
  'admin credit deduction': CREDIT_TRANSACTION_TYPE.FUND_TRANSFER,
  'admin credit adjustment': CREDIT_TRANSACTION_TYPE.FUND_TRANSFER,
  transfer: CREDIT_TRANSACTION_TYPE.FUND_TRANSFER,
  hold: CREDIT_TRANSACTION_TYPE.ESCROW_HOLD,
  release: CREDIT_TRANSACTION_TYPE.ESCROW_RELEASE,
  refund: CREDIT_TRANSACTION_TYPE.ESCROW_REFUND,
  purchase: CREDIT_TRANSACTION_TYPE.ASSET_PURCHASE,
  fee: CREDIT_TRANSACTION_TYPE.FEE,
  cashout: CREDIT_TRANSACTION_TYPE.CASHOUT,
  'cashout refund': CREDIT_TRANSACTION_TYPE.CASHOUT_REFUND,
  'job posting fee': CREDIT_TRANSACTION_TYPE.JOB_POSTING_FEE,
  'job posting fee refund': CREDIT_TRANSACTION_TYPE.JOB_POSTING_FEE_REFUND,
  'proposal fee': CREDIT_TRANSACTION_TYPE.PROPOSAL_FEE,
  'proposal fee refund': CREDIT_TRANSACTION_TYPE.PROPOSAL_FEE_REFUND,
  'service posting fee': CREDIT_TRANSACTION_TYPE.SERVICE_POSTING_FEE,
  'gig posting fee': CREDIT_TRANSACTION_TYPE.SERVICE_POSTING_FEE,
});

const LEGACY_STATUS_MAP = Object.freeze({
  pending: CREDIT_TRANSACTION_STATUS.PENDING,
  completed: CREDIT_TRANSACTION_STATUS.COMPLETED,
  success: CREDIT_TRANSACTION_STATUS.COMPLETED,
  paid: CREDIT_TRANSACTION_STATUS.COMPLETED,
  failed: CREDIT_TRANSACTION_STATUS.FAILED,
  failure: CREDIT_TRANSACTION_STATUS.FAILED,
  reversed: CREDIT_TRANSACTION_STATUS.REVERSED,
  refunded: CREDIT_TRANSACTION_STATUS.REVERSED,
});

function normalizeCreditTransactionType(value, fallback = CREDIT_TRANSACTION_TYPE.FUND_TRANSFER) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (CREDIT_TRANSACTION_TYPES.includes(raw)) return raw;
  const exact = CREDIT_TRANSACTION_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const mapped = LEGACY_TYPE_MAP[raw.toLowerCase()];
  if (mapped) return mapped;
  return fallback;
}

function normalizeCreditTransactionStatus(value, fallback = CREDIT_TRANSACTION_STATUS.COMPLETED) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (CREDIT_TRANSACTION_STATUSES.includes(raw)) return raw;
  const exact = CREDIT_TRANSACTION_STATUSES.find((s) => s.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const mapped = LEGACY_STATUS_MAP[raw.toLowerCase()];
  if (mapped) return mapped;
  return fallback;
}

module.exports = {
  CREDIT_TRANSACTION_TYPES,
  CREDIT_TRANSACTION_TYPE,
  CREDIT_TRANSACTION_STATUSES,
  CREDIT_TRANSACTION_STATUS,
  LEGACY_TYPE_MAP,
  LEGACY_STATUS_MAP,
  normalizeCreditTransactionType,
  normalizeCreditTransactionStatus,
};
