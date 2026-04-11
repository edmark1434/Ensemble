const client = require('../lib/database');

async function getAllAccounts() {
    try {
        const result = await client.query('SELECT * FROM accounts');
        return result.rows;
    } catch (err) {
        console.error('Error fetching accounts:', err);
        throw err;
    }
}

async function getAccountById(accountId) {
    try {
        const result = await client.query('SELECT * FROM accounts WHERE account_id = $1', [accountId]);
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
    type = 'personal',
    status = 'active',
    deletedAt = null,
} = {}) {
    try {
        const result = await client.query(
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
            RETURNING account_id`,
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
        const result = await client.query('SELECT handle FROM accounts WHERE handle = $1', [handle]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching account with handle ${handle}:`, err);
        throw err;
    }
}
module.exports = {
    getAllAccounts,
    getAccountById,
    createAccount,
    getAccountByHandle
};