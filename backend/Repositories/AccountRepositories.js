const { pool } = require('../lib/database');

async function getAllAccounts() {
    try {
        const result = await pool.query('SELECT * FROM accounts');
        return result.rows;
    } catch (err) {
        console.error('Error fetching accounts:', err);
        throw err;
    }
}

async function getAccountById(accountId) {
    try {
        const result = await pool.query('SELECT * FROM accounts WHERE account_id = $1', [accountId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching account with id ${accountId}:`, err);
        throw err;
    }
}

async function createAccount({
    displayName = null,
    handle = null,
    avatarFileId = null,
    tagline = null,
    description = null,
    type = 'User',
    status = 'active',
    deletedAt = null,
} = {}) {
    try {
        const result = await pool.query(
            `INSERT INTO accounts (
                display_name,
                handle,
                avatar_file_id,
                tagline,
                description,
                type,
                status,
                deleted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING account_id, type, handle, status, display_name`,
            [
                displayName,
                handle,
                avatarFileId,
                tagline,
                description,
                type,
                status,
                deletedAt,
            ]
        );
        return result.rows[0];
    } catch (err) {
        console.error('Error creating account:', err);
        throw err;
    }
}

async function getAccountByHandle(handle) {
    try{
        const result = await pool.query('SELECT handle FROM accounts WHERE handle = $1', [handle]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching account with handle ${handle}:`, err);
        throw err;
    }
}

async function getAccountWalletRepositories(accountId,type = 'account wallets') { 
    try {
        const queryText = `
            SELECT 
                w.wallet_id, 
                w.type,
                w.status, 
                w.balance_credits, 
                w.frozen_balance_credits 
            FROM wallets w
            INNER JOIN account_wallets aw ON w.wallet_id = aw.wallet_id
            WHERE aw.account_id = $1
              AND w.type = $2
              AND w.status = 'active';
        `;

        const result = await pool.query(queryText, [accountId, type]);

        // If a matching active account wallet is found, return it. Otherwise, return null.
        return result.rows.length > 0 ? result.rows[0] : null;

    } catch (err) {
        console.error(`Error fetching wallet for account ${accountId}:`, err);
        throw err;
    }
}

async function checkAccountId(accountId) { 
    try {
        const queryText = `
            SELECT EXISTS(
                SELECT 1 FROM accounts WHERE account_id = $1
            );
        `;
        const result = await pool.query(queryText, [accountId]);
        
        // result.rows[0].exists will look like: true OR false
        return result.rows[0].exists; 
    } catch (err) { 
        console.error(`Error checking existence for account id ${accountId}:`, err);
        throw err;
    }
}

module.exports = {
    getAllAccounts,
    getAccountById,
    createAccount,
    getAccountByHandle,
    getAccountWalletRepositories,
    checkAccountId,
};