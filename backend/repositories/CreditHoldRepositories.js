const { pool } = require('../lib/Database');
const { CREDIT_TRANSACTION_TYPE } = require('../lib/CreditTransactionEnums');

/**
 * Staff credit holds ("freeze credits"). A hold moves the member's available Account Wallet
 * balance into frozen_balance_credits, where it cannot be spent, transferred or cashed out,
 * and records why, by whom and until when. Releasing moves every held credit back.
 *
 * Both directions lock the wallet row and update relatively, so a purchase or payout landing
 * at the same moment is never lost or double counted. Each move writes one ledger row that
 * references the wallet.
 */

const HOLD_COLUMNS = `
  w.wallet_id, w.balance_credits, w.frozen_balance_credits,
  w.frozen_at, w.frozen_until, w.frozen_reason, w.frozen_by_staff_id
`;

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
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
 * The account wallet that holds (or will hold) the credits. A wallet that already has held
 * credits comes first so a release always finds them.
 */
async function lockAccountWallet(client, accountId) {
  const result = await client.query(
    `SELECT ${HOLD_COLUMNS}
     FROM wallets w
     JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
     WHERE aw.account_id = $1 AND w.type = 'account wallets'
     ORDER BY (w.frozen_balance_credits > 0) DESC, w.created_at DESC
     LIMIT 1
     FOR UPDATE OF w`,
    [accountId]
  );
  return result.rows[0] || null;
}

function holdError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/** Current hold on an account, for display. Null when nothing is held. */
async function getAccountCreditHold(accountId) {
  const result = await pool.query(
    `SELECT
       COALESCE(SUM(w.frozen_balance_credits), 0)::bigint AS frozen,
       BOOL_OR(w.frozen_until IS NULL) AS open_ended,
       MAX(w.frozen_until) AS frozen_until,
       MAX(w.frozen_at) AS frozen_at,
       (ARRAY_AGG(w.frozen_reason ORDER BY w.frozen_at DESC NULLS LAST))[1] AS frozen_reason
     FROM wallets w
     JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
     WHERE aw.account_id = $1
       AND w.type = 'account wallets'
       AND w.frozen_balance_credits > 0`,
    [accountId]
  );
  const row = result.rows[0];
  const frozen = Number(row?.frozen || 0);
  if (!frozen) return null;
  return {
    frozenCredits: frozen,
    frozenAt: row.frozen_at || null,
    // One wallet with no end date means the whole hold waits for staff.
    frozenUntil: row.open_ended ? null : row.frozen_until || null,
    reason: row.frozen_reason || null,
  };
}

/**
 * Hold everything currently available in the account wallet. A second hold adds to the first
 * and its reason and end date replace the old ones: the latest staff decision governs.
 */
async function placeCreditHold({ accountId, reason, frozenUntil = null, staffId = null }) {
  return withTransaction(async (client) => {
    const wallet = await lockAccountWallet(client, accountId);
    if (!wallet) throw holdError('No account wallet found for this account', 404);
    const moved = Number(wallet.balance_credits || 0);
    if (moved <= 0) throw holdError('No available credits to freeze', 409);

    const updated = await client.query(
      `UPDATE wallets
       SET frozen_balance_credits = frozen_balance_credits + balance_credits,
           balance_credits = 0,
           frozen_at = NOW(),
           frozen_until = $2,
           frozen_reason = $3,
           frozen_by_staff_id = $4
       WHERE wallet_id = $1
       RETURNING frozen_balance_credits, frozen_at, frozen_until`,
      [wallet.wallet_id, frozenUntil, reason, staffId]
    );
    await client.query(
      `INSERT INTO credit_transactions (
         type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
       ) VALUES ($1, $2, 'Completed', $3, $3, 'wallets', $3)`,
      [CREDIT_TRANSACTION_TYPE.ESCROW_HOLD, moved, wallet.wallet_id]
    );
    const row = updated.rows[0];
    return {
      walletId: wallet.wallet_id,
      moved,
      frozenBalanceCredits: Number(row.frozen_balance_credits || 0),
      frozenAt: row.frozen_at,
      frozenUntil: row.frozen_until || null,
    };
  });
}

/**
 * Return every held credit to the available balance and clear the hold.
 * With onlyIfDue, the hold is released only when its end date has passed (the background
 * job), so a staff extension made a moment earlier is respected.
 * @returns {Promise<null | { walletId: string, released: number, balanceCredits: number, reason: string|null }>}
 */
async function releaseCreditHold({ accountId, onlyIfDue = false }) {
  return withTransaction(async (client) => {
    const wallet = await lockAccountWallet(client, accountId);
    if (!wallet) return null;
    const released = Number(wallet.frozen_balance_credits || 0);
    if (released <= 0) return null;
    if (onlyIfDue) {
      const until = wallet.frozen_until ? new Date(wallet.frozen_until).getTime() : null;
      if (!until || until > Date.now()) return null;
    }
    const updated = await client.query(
      `UPDATE wallets
       SET balance_credits = balance_credits + frozen_balance_credits,
           frozen_balance_credits = 0,
           frozen_at = NULL,
           frozen_until = NULL,
           frozen_reason = NULL,
           frozen_by_staff_id = NULL
       WHERE wallet_id = $1
       RETURNING balance_credits`,
      [wallet.wallet_id]
    );
    await client.query(
      `INSERT INTO credit_transactions (
         type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
       ) VALUES ($1, $2, 'Completed', $3, $3, 'wallets', $3)`,
      [CREDIT_TRANSACTION_TYPE.ESCROW_RELEASE, released, wallet.wallet_id]
    );
    return {
      walletId: wallet.wallet_id,
      released,
      balanceCredits: Number(updated.rows[0]?.balance_credits || 0),
      reason: wallet.frozen_reason || null,
    };
  });
}

/** Accounts whose hold end date has passed. Safe to run twice: release re-checks under lock. */
async function listDueCreditHolds(limit = 50) {
  const result = await pool.query(
    `SELECT DISTINCT aw.account_id, w.frozen_until
     FROM wallets w
     JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
     WHERE w.type = 'account wallets'
       AND w.frozen_balance_credits > 0
       AND w.frozen_until IS NOT NULL
       AND w.frozen_until <= NOW()
     ORDER BY w.frozen_until ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map((row) => String(row.account_id));
}

/**
 * An accepted appeal ends the hold within 24 hours — never later than it was going to end.
 * Runs inside the appeal decision's transaction.
 */
async function endCreditHoldWithin24Hours(client, accountId) {
  const result = await client.query(
    `UPDATE wallets w
     SET frozen_until = LEAST(COALESCE(w.frozen_until, 'infinity'::timestamptz), NOW() + INTERVAL '24 hours')
     FROM account_wallets aw
     WHERE aw.wallet_id = w.wallet_id
       AND aw.account_id = $1
       AND w.type = 'account wallets'
       AND w.frozen_balance_credits > 0
     RETURNING w.frozen_balance_credits`,
    [accountId]
  );
  return result.rows.reduce((sum, row) => sum + Number(row.frozen_balance_credits || 0), 0);
}

module.exports = {
  getAccountCreditHold,
  placeCreditHold,
  releaseCreditHold,
  listDueCreditHolds,
  endCreditHoldWithin24Hours,
};
