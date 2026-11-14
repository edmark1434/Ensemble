const { pool } = require('../lib/Database');

async function getCreditTransactionsByAccountId(accountId) {
    const query = `
        WITH account_transaction_wallets AS (
            SELECT wallet_id
            FROM account_wallets
            WHERE account_id = $1
        )
        SELECT
            ct.credit_transaction_id,
            ct.type,
            ct.amount_credits,
            ct.status,
            ct.created_at,
            ct.fee_transaction_id,
            ct.source_wallet_id,
            ct.destination_wallet_id,
            ct.reference_table,
            ct.reference_id,
            source_wallet.type AS source_wallet_type,
            destination_wallet.type AS destination_wallet_type,
            source_owner.display_name AS source_account_name,
            source_owner.handle AS source_account_handle,
            source_owner.type AS source_account_type,
            destination_owner.display_name AS destination_account_name,
            destination_owner.handle AS destination_account_handle,
            destination_owner.type AS destination_account_type,
            EXISTS (
                SELECT 1
                FROM account_transaction_wallets atw
                WHERE atw.wallet_id = ct.source_wallet_id
            ) AS source_owned,
            EXISTS (
                SELECT 1
                FROM account_transaction_wallets atw
                WHERE atw.wallet_id = ct.destination_wallet_id
            ) AS destination_owned
        FROM credit_transactions ct
        INNER JOIN wallets source_wallet
            ON source_wallet.wallet_id = ct.source_wallet_id
        INNER JOIN wallets destination_wallet
            ON destination_wallet.wallet_id = ct.destination_wallet_id
        LEFT JOIN LATERAL (
            SELECT a.display_name, a.handle, a.type
            FROM account_wallets aw
            INNER JOIN accounts a ON a.account_id = aw.account_id
            WHERE aw.wallet_id = ct.source_wallet_id
            LIMIT 1
        ) source_owner ON TRUE
        LEFT JOIN LATERAL (
            SELECT a.display_name, a.handle, a.type
            FROM account_wallets aw
            INNER JOIN accounts a ON a.account_id = aw.account_id
            WHERE aw.wallet_id = ct.destination_wallet_id
            LIMIT 1
        ) destination_owner ON TRUE
        WHERE EXISTS (
            SELECT 1
            FROM account_transaction_wallets atw
            WHERE atw.wallet_id = ct.source_wallet_id
               OR atw.wallet_id = ct.destination_wallet_id
        )
        ORDER BY ct.created_at DESC, ct.credit_transaction_id DESC
    `;

    const result = await pool.query(query, [accountId]);
    return result.rows;
}

/**
 * Dispute payouts that will land in one of this account's wallets but have not been paid
 * yet. They have no ledger row until they are paid, so the history shows them separately.
 */
async function getPendingDisputePayoutsByAccountId(accountId) {
    try {
        const result = await pool.query(
            `
            SELECT
                p.dispute_payout_id,
                p.kind,
                p.amount_credits,
                p.status,
                p.release_at,
                p.created_at,
                p.transaction_type,
                p.source_wallet_id,
                p.destination_wallet_id,
                d.dispute_id,
                d.dispute_number,
                d.status AS dispute_status,
                destination_wallet.type AS destination_wallet_type
            FROM dispute_payouts p
            INNER JOIN account_wallets aw ON aw.wallet_id = p.destination_wallet_id
            INNER JOIN disputes d ON d.dispute_id = p.dispute_id
            INNER JOIN wallets destination_wallet ON destination_wallet.wallet_id = p.destination_wallet_id
            WHERE aw.account_id = $1
              AND p.status IN ('scheduled', 'failed')
              AND d.deleted_at IS NULL
            ORDER BY p.release_at ASC, p.dispute_payout_id ASC
            `,
            [accountId]
        );
        return result.rows;
    } catch (error) {
        // The payouts table arrives with a migration; until then there is nothing pending.
        if (error.code === '42P01') return [];
        throw error;
    }
}

async function getAccountWalletSummaryByAccountId(accountId) {
    const query = `
        SELECT
            COALESCE(SUM(CASE WHEN LOWER(w.type) = 'account wallets' THEN w.balance_credits ELSE 0 END), 0)::int AS available_credits,
            COALESCE(SUM(CASE WHEN LOWER(w.type) = 'escrow wallets' THEN w.balance_credits ELSE 0 END), 0)::int AS escrow_credits,
            COALESCE(SUM(CASE WHEN LOWER(w.type) = 'account wallets' THEN w.frozen_balance_credits ELSE 0 END), 0)::int AS frozen_credits
        FROM account_wallets aw
        INNER JOIN wallets w ON w.wallet_id = aw.wallet_id
        WHERE aw.account_id = $1
    `;
    const result = await pool.query(query, [accountId]);
    const row = result.rows[0] || {};
    return {
        availableCredits: Number(row.available_credits || 0),
        escrowCredits: Number(row.escrow_credits || 0),
        frozenCredits: Number(row.frozen_credits || 0),
    };
}

module.exports = {
    getCreditTransactionsByAccountId,
    getPendingDisputePayoutsByAccountId,
    getAccountWalletSummaryByAccountId,
};
