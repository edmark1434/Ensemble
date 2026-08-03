const { pool } = require('../lib/database');

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

module.exports = { getCreditTransactionsByAccountId };
