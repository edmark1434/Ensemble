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

async function getProfileRepositories(accountId) {
    try {
        const queryText = `
            SELECT 
                A.DISPLAY_NAME AS NAME, 
                U.EMAIL_ADDRESS, 
                A.TAGLINE, 
                A.DESCRIPTION AS BIO, 
                A.CREATED_AT, 
                A.MERIT_SCORE, 
                A.AVATAR_FILE_ID,
                U.COUNTRY AS LOCATION,
                U.USER_ID,
                V.IS_VERIFIED AS VERIFICATION_STATUS,
                -- Aggregates all matching ACCOUNT_LINK rows into a JSON array
                COALESCE(
                    (
                        SELECT json_agg(json_build_object(
                            'platform', AL.PLATFORM,
                            'url', AL.URL
                        )) 
                        FROM ACCOUNT_LINK AL 
                        WHERE AL.ACCOUNT_ID = A.ACCOUNT_ID
                    ), 
                    '[]'::json
                ) AS SOCIAL_LINKS
            FROM ACCOUNTS A
            LEFT JOIN USERS U ON A.ACCOUNT_ID = U.ACCOUNT_ID
            LEFT JOIN VERIFICATIONS V ON V.ACCOUNT_ID = A.ACCOUNT_ID
            WHERE A.ACCOUNT_ID = $1
            LIMIT 1;
        `;
        
        const result = await pool.query(queryText, [accountId]);
        // Since we aggregated the links, we can safely limit to the first row here
        return result.rows[0] || null; 
    
    } catch (err) {
        console.error(`Error fetching profile for account ${accountId}:`, err.message);
        throw err;
    }
}

async function getAccountLinkByAccountIdRepositories(accountId) { 
    try {
        const result = await pool.query('SELECT account_link_id,platform,url FROM account_link WHERE account_id = $1', [accountId]);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching account links for account ${accountId}:`, err);
        throw err;
    }
}

async function checkUserAccountIdRepositories(accountId) { 
    try{
        const isRoleResult = await pool.query('SELECT EXISTS(SELECT 1 FROM accounts WHERE account_id = $1 AND type = $2)', [accountId, 'User']);
        return isRoleResult.rows[0].exists;
    }catch(err){
        console.error(`Error checking role for account ${accountId}:`, err);
        throw err;
    }
}

async function getDisplayNameByAccountId(listOfAccountIds) {
    try {
        const placeholders = listOfAccountIds.map((_, index) => `$${index + 1}`).join(',');
        const queryText = `SELECT account_id, display_name FROM accounts WHERE account_id IN (${placeholders})`;
        const result = await pool.query(queryText, listOfAccountIds);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching display names for accounts ${listOfAccountIds.join(', ')}:`, err);
        throw err;
    }
}

async function updateAndInsertAccountProfile(accountId, profileData) {
    const { name, path, mime_type, size_bytes } = profileData;
    console.log('Updating/Inserting profile for accountId:', accountId, 'with data:', { name, path, mime_type, size_bytes });
    const fileQuery = `INSERT INTO files (name, path, mime_type, size_bytes)
                       VALUES ($1, $2, $3, $4)
                       RETURNING file_id`;
    const updateAccountQuery = `UPDATE accounts SET AVATAR_FILE_ID = $1 WHERE account_id = $2`;
    const accountProfileFilesQuery = `INSERT INTO account_profile_files (account_id, file_id)
    VALUES ($1, $2)`;

    try {
        const fileResult = await pool.query(fileQuery, [name, path, mime_type, size_bytes]);
        const fileId = fileResult.rows[0].file_id;
        await Promise.all([
            pool.query(updateAccountQuery, [fileId, accountId]),
            pool.query(accountProfileFilesQuery, [accountId, fileId])
        ]);
        return fileId;
    }catch (err) {
        console.error(`Error updating and inserting account profile for account ${accountId}:`, err);
        throw err;
    }
}

async function updateAccountProfile(accountId, fileId) { 
    const updateAccountQuery = `UPDATE accounts SET AVATAR_FILE_ID = $1 WHERE account_id = $2`;
    try {
        await pool.query(updateAccountQuery, [fileId, accountId]);
        return true;
    } catch (err) {
        console.error(`Error updating account profile for account ${accountId}:`, err);
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
    getProfileRepositories,
    getAccountLinkByAccountIdRepositories,
    checkUserAccountIdRepositories,
    getDisplayNameByAccountId,
    updateAndInsertAccountProfile,
    updateAccountProfile
};