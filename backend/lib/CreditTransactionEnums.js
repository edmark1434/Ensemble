/**
 * CREDIT_TRANSACTION.type — canonical Title Case labels for Ensemble.
 */

const CREDIT_TRANSACTION_TYPES = Object.freeze([
  'Fund Transfer',
  'Escrow Hold',
  'Escrow Release',
  'Escrow Refund',
  'Asset Purchase',
  'Asset Refund',
  'Fee',
]);

const CREDIT_TRANSACTION_TYPE = Object.freeze({
  FUND_TRANSFER: 'Fund Transfer',
  ESCROW_HOLD: 'Escrow Hold',
  ESCROW_RELEASE: 'Escrow Release',
  ESCROW_REFUND: 'Escrow Refund',
  ASSET_PURCHASE: 'Asset Purchase',
  ASSET_REFUND: 'Asset Refund',
  FEE: 'Fee',
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

module.exports = {
  CREDIT_TRANSACTION_TYPES,
  CREDIT_TRANSACTION_TYPE,
  LEGACY_TYPE_MAP,
  normalizeCreditTransactionType,
};
