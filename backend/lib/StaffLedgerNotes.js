/**
 * Staff credit actions write a self-transfer ledger row (source = destination, unsigned
 * amount). What the row means lives on its account_activity row:
 *
 * - Adjustment (Fund Transfer): CREDITS_ADJUSTED references the ledger row by id and holds
 *   the signed `delta` and the `reason` shown to the member.
 * - Hold / release (Escrow Hold / Escrow Release on `wallets`): CREDITS_FROZEN /
 *   CREDITS_UNFROZEN reference the wallet. New rows carry the ledger id in
 *   `metadata.creditTransactionId`; older rows are matched by wallet, type and time.
 *
 * `staffLedgerNoteJoins` adds `staff_adj` and `staff_hold` to a ledger read; select
 * STAFF_LEDGER_NOTE_COLUMNS and read them with `staffAdjustmentOf` / `staffHoldOf`.
 */

/**
 * @param {{ ledger?: string, accountId: string }} options
 *   `ledger` is the alias of the credit_transactions row, `accountId` an SQL expression for
 *   the account that owns the wallet (keeps the hold lookup on the account/time index).
 */
function staffLedgerNoteJoins({ ledger = 'ct', accountId }) {
  return `
  LEFT JOIN LATERAL (
    SELECT aa.metadata
    FROM account_activity aa
    WHERE ${ledger}.source_wallet_id = ${ledger}.destination_wallet_id
      AND aa.event_code = 'CREDITS_ADJUSTED'
      AND aa.reference_id = ${ledger}.credit_transaction_id::text
    ORDER BY aa.created_at DESC
    LIMIT 1
  ) staff_adj ON TRUE
  LEFT JOIN LATERAL (
    SELECT aa.metadata
    FROM account_activity aa
    WHERE ${ledger}.source_wallet_id = ${ledger}.destination_wallet_id
      AND ${ledger}.reference_table = 'wallets'
      AND ${ledger}.type IN ('Escrow Hold', 'Escrow Release')
      AND aa.account_id = ${accountId}
      AND aa.event_code = CASE WHEN ${ledger}.type = 'Escrow Hold' THEN 'CREDITS_FROZEN' ELSE 'CREDITS_UNFROZEN' END
      AND aa.reference_id = ${ledger}.source_wallet_id::text
      AND aa.created_at >= ${ledger}.created_at - INTERVAL '5 seconds'
      AND aa.created_at <= ${ledger}.created_at + INTERVAL '2 minutes'
    ORDER BY
      (aa.metadata->>'creditTransactionId' = ${ledger}.credit_transaction_id::text) DESC NULLS LAST,
      ABS(EXTRACT(EPOCH FROM (aa.created_at - ${ledger}.created_at))) ASC
    LIMIT 1
  ) staff_hold ON TRUE`;
}

const STAFF_LEDGER_NOTE_COLUMNS = `staff_adj.metadata AS staff_adjustment, staff_hold.metadata AS staff_hold`;

function asObject(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function isSelfTransfer(row) {
  return Boolean(row.source_wallet_id) && String(row.source_wallet_id) === String(row.destination_wallet_id);
}

/** A staff grant / deduction row. `delta` is null for rows written before the audit existed. */
function staffAdjustmentOf(row) {
  if (!isSelfTransfer(row)) return null;
  if (String(row.type || '').toLowerCase() !== 'fund transfer') return null;
  if (String(row.reference_table || '').toLowerCase() === 'dev_credit_injection') return null;
  const meta = asObject(row.staff_adjustment);
  const delta = Number(meta?.delta);
  return {
    delta: Number.isFinite(delta) && delta !== 0 ? delta : null,
    reason: meta?.reason ? String(meta.reason) : null,
    sourceTable: meta?.sourceTable || null,
  };
}

/** A staff hold or release row, with the reason, end date and why it was released. */
function staffHoldOf(row) {
  if (!isSelfTransfer(row)) return null;
  if (String(row.reference_table || '').toLowerCase() !== 'wallets') return null;
  const type = String(row.type || '').toLowerCase();
  if (type !== 'escrow hold' && type !== 'escrow release') return null;
  const meta = asObject(row.staff_hold);
  return {
    held: type === 'escrow hold',
    reason: meta?.reason ? String(meta.reason) : null,
    until: meta?.frozenUntil || null,
    source: meta?.source || null,
  };
}

module.exports = {
  staffLedgerNoteJoins,
  STAFF_LEDGER_NOTE_COLUMNS,
  staffAdjustmentOf,
  staffHoldOf,
};
