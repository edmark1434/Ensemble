const { pool } = require('../lib/Database');

/**
 * A wallet's balance before and after a ledger row, rebuilt from the ledger.
 *
 * The ledger stores no balances, so the wallet's current balance is the anchor: a row's
 * "after" is the current balance minus the effect of every later row on that wallet, and its
 * "before" is "after" minus the row's own effect. Effects follow the desk's movement rules:
 * - only Completed and Reversed rows moved credits (a reversed row still moved them; its
 *   compensating row moves them back). Pending and Failed rows leave the balance unchanged;
 * - a transfer between two wallets adds to the destination and takes from the source;
 * - a staff adjustment (Fund Transfer to itself) moves its audited `delta`. One written before
 *   the audit has no sign, so it counts as zero and the balances it affects are `approximate`;
 * - a staff hold (Escrow Hold to itself, reference `wallets`) moves credits from spendable to
 *   held; its release (Escrow Release) moves them back.
 *
 * Rows written in one database transaction share `created_at`. Among them, credits in count
 * before credits out, so a payout and the fee taken from it never dip the balance below zero.
 * Credits that changed outside the ledger (seeded wallets) show up as an opening balance.
 *
 * Platform wallets are skipped: every top-up and fee touches them, so rebuilding their history
 * would read most of the ledger.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MOVED = `('Completed', 'Reversed')`;

const BALANCE_SQL = `
  WITH pairs AS (
    SELECT DISTINCT p.tx_id, p.wallet_id
    FROM unnest($1::uuid[], $2::uuid[]) AS p(tx_id, wallet_id)
  ),
  targets AS (
    SELECT w.wallet_id, w.balance_credits, w.frozen_balance_credits
    FROM wallets w
    WHERE w.wallet_id IN (SELECT wallet_id FROM pairs)
      AND w.type IN ('account wallets', 'escrow wallets')
  ),
  moves AS (
    -- Rows into the wallet, and the wallet's own self-transfers (adjustments and holds).
    SELECT
      t.wallet_id,
      ct.credit_transaction_id AS tx_id,
      ct.created_at,
      CASE
        WHEN ct.status::text NOT IN ${MOVED} THEN 0
        WHEN ct.source_wallet_id <> ct.destination_wallet_id THEN ABS(ct.amount_credits)
        WHEN ct.type::text = 'Fund Transfer' THEN COALESCE((adj.metadata->>'delta')::numeric, 0)
        WHEN ct.reference_table = 'wallets' AND ct.type::text = 'Escrow Hold' THEN -ABS(ct.amount_credits)
        WHEN ct.reference_table = 'wallets' AND ct.type::text = 'Escrow Release' THEN ABS(ct.amount_credits)
        ELSE 0
      END AS spendable,
      CASE
        WHEN ct.status::text NOT IN ${MOVED} OR ct.source_wallet_id <> ct.destination_wallet_id THEN 0
        WHEN ct.reference_table = 'wallets' AND ct.type::text = 'Escrow Hold' THEN ABS(ct.amount_credits)
        WHEN ct.reference_table = 'wallets' AND ct.type::text = 'Escrow Release' THEN -ABS(ct.amount_credits)
        ELSE 0
      END AS held,
      (
        ct.source_wallet_id = ct.destination_wallet_id
        AND ct.type::text = 'Fund Transfer'
        AND ct.status::text IN ${MOVED}
        AND adj.metadata IS NULL
      ) AS unsigned
    FROM targets t
    INNER JOIN credit_transactions ct ON ct.destination_wallet_id = t.wallet_id
    LEFT JOIN LATERAL (
      SELECT aa.metadata
      FROM account_activity aa
      WHERE ct.source_wallet_id = ct.destination_wallet_id
        AND ct.type::text = 'Fund Transfer'
        AND aa.event_code = 'CREDITS_ADJUSTED'
        AND aa.reference_id = ct.credit_transaction_id::text
      ORDER BY aa.created_at DESC
      LIMIT 1
    ) adj ON TRUE
    UNION ALL
    -- Rows out of the wallet to another wallet.
    SELECT
      t.wallet_id,
      ct.credit_transaction_id,
      ct.created_at,
      CASE WHEN ct.status::text IN ${MOVED} THEN -ABS(ct.amount_credits) ELSE 0 END,
      0,
      FALSE
    FROM targets t
    INNER JOIN credit_transactions ct
      ON ct.source_wallet_id = t.wallet_id AND ct.destination_wallet_id <> t.wallet_id
  ),
  running AS (
    SELECT
      m.*,
      COALESCE(SUM(m.spendable) OVER later, 0) AS later_spendable,
      COALESCE(SUM(m.held) OVER later, 0) AS later_held,
      COALESCE(BOOL_OR(m.unsigned) OVER later, FALSE) AS later_unsigned
    FROM moves m
    -- Newest first, so the frame before a row is everything that happened after it.
    WINDOW later AS (
      PARTITION BY m.wallet_id
      ORDER BY m.created_at DESC, (m.spendable < 0) DESC, m.tx_id DESC
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    )
  )
  SELECT
    r.tx_id,
    r.wallet_id,
    (t.balance_credits - r.later_spendable - r.spendable)::bigint AS spendable_before,
    (t.balance_credits - r.later_spendable)::bigint AS spendable_after,
    (t.frozen_balance_credits - r.later_held - r.held)::bigint AS held_before,
    (t.frozen_balance_credits - r.later_held)::bigint AS held_after,
    (r.unsigned OR r.later_unsigned) AS approximate
  FROM running r
  INNER JOIN pairs p ON p.tx_id = r.tx_id AND p.wallet_id = r.wallet_id
  INNER JOIN targets t ON t.wallet_id = r.wallet_id
`;

function balanceKey(transactionId, walletId) {
  return `${String(transactionId).toLowerCase()}:${String(walletId).toLowerCase()}`;
}

/**
 * Balances around ledger rows, for the given (transaction, wallet) pairs. Returns a Map keyed
 * by `balanceKey(transactionId, walletId)`; pairs on platform wallets, unknown ids, or a
 * wallet the row does not touch are left out.
 * @param {{ transactionId: string, walletId: string }[]} pairs
 */
async function fetchLedgerBalances(pairs, { db = pool } = {}) {
  const txIds = [];
  const walletIds = [];
  for (const pair of pairs || []) {
    const tx = String(pair?.transactionId || '');
    const wallet = String(pair?.walletId || '');
    if (!UUID_RE.test(tx) || !UUID_RE.test(wallet)) continue;
    txIds.push(tx);
    walletIds.push(wallet);
  }
  const out = new Map();
  if (!txIds.length) return out;

  const result = await db.query(BALANCE_SQL, [txIds, walletIds]);
  for (const row of result.rows) {
    out.set(balanceKey(row.tx_id, row.wallet_id), {
      walletId: row.wallet_id,
      before: Number(row.spendable_before),
      after: Number(row.spendable_after),
      heldBefore: Number(row.held_before),
      heldAfter: Number(row.held_after),
      approximate: Boolean(row.approximate),
    });
  }
  return out;
}

module.exports = { fetchLedgerBalances, balanceKey };
