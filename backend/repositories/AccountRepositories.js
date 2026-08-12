const { pool } = require('../lib/Database');
const { insertWithPublicIdRetry } = require('../lib/PublicId');

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
        return await insertWithPublicIdRetry((publicId) => pool.query(
            `INSERT INTO accounts (
                public_id,
                display_name,
                handle,
                avatar_file_id,
                tagline,
                description,
                type,
                status,
                deleted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (public_id) DO NOTHING
            RETURNING account_id, public_id, type, handle, status, display_name`,
            [
                publicId,
                displayName,
                handle,
                avatarFileId,
                tagline,
                description,
                type,
                status,
                deletedAt,
            ]
        ));
    } catch (err) {
        console.error('Error creating account:', err);
        throw err;
    }
}

async function getAccountByHandle(handle) {
    try{
        const result = await pool.query(
            'SELECT account_id, public_id, handle, display_name FROM accounts WHERE LOWER(handle) = LOWER($1)',
            [handle]
        );
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching account with handle ${handle}:`, err);
        throw err;
    }
}

async function searchUserAccountsByHandle(handle, excludeAccountId, limit = 10) {
    const search = String(handle || '').replace(/^@/, '').trim();
    if (!search) return [];

    const escapedSearch = search.replace(/[\\%_]/g, '\\$&');

    const result = await pool.query(
        `SELECT
            a.account_id,
            a.public_id,
            a.display_name,
            u.first_name || ' ' || u.last_name AS full_name,
            a.handle,
            f.path AS avatar_preset_url,
            COALESCE(v.is_verified, FALSE) AS verification_status,
            p.name AS subscriptiontype,
            a.merit_score,
            (SELECT COUNT(*) FROM account_followers WHERE followed_id = a.account_id) AS followers_count,
            (SELECT COUNT(*) FROM account_followers WHERE follower_id = a.account_id) AS following_count,
            EXISTS(SELECT 1 FROM account_followers WHERE follower_id = $3::uuid AND followed_id = a.account_id) AS is_following,
            EXISTS(SELECT 1 FROM account_followers WHERE follower_id = a.account_id AND followed_id = $3::uuid) AS is_followed_by,
            a.description AS bio,
            a.tagline AS tagline,
            COALESCE(
                (SELECT json_agg(json_build_object('role_id', pp.plpu_id, 'role_name', pp.purpose_name))
                 FROM platform_purpose pp JOIN user_platform_purpose upp ON pp.plpu_id = upp.plpu_id WHERE upp.user_id = u.user_id),
                '[]'::json
            ) AS roles
         FROM accounts a
         JOIN users u ON u.account_id = a.account_id
         LEFT JOIN files f ON f.file_id = a.avatar_file_id
         LEFT JOIN verifications v ON a.account_id = v.account_id
         LEFT JOIN subscriptions s ON u.user_id = s.user_id
         LEFT JOIN plans p ON s.plan_id = p.plan_id
         WHERE a.type = 'User'
           AND LOWER(a.status) = 'active'
           AND a.deleted_at IS NULL
           AND (
                LOWER(a.handle) LIKE '%' || LOWER($1) || '%' ESCAPE '\\'
                OR LOWER(a.display_name) LIKE '%' || LOWER($1) || '%' ESCAPE '\\'
           )
         ORDER BY
           CASE
             WHEN LOWER(a.handle) = LOWER($2) THEN 0
             WHEN LOWER(a.display_name) = LOWER($2) THEN 1
             WHEN LOWER(a.handle) LIKE LOWER($1) || '%' ESCAPE '\\' THEN 2
             WHEN LOWER(a.display_name) LIKE LOWER($1) || '%' ESCAPE '\\' THEN 3
             ELSE 4
           END,
           a.display_name
         LIMIT $4`,
        [escapedSearch, search, excludeAccountId || null, limit]
    );

    return result.rows;
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
                A.PUBLIC_ID,
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
                ) AS SOCIAL_LINKS,
                (SELECT COUNT(*) FROM account_followers WHERE followed_id = A.ACCOUNT_ID) AS followers_count,
                (SELECT COUNT(*) FROM account_followers WHERE follower_id = A.ACCOUNT_ID) AS following_count
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
//jp
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

async function getRecentUserAvatarsRepositories(limit = 5) {
    try {
        const query = `
            SELECT 
                f.path AS avatar_path
            FROM accounts a
            INNER JOIN users u ON a.account_id = u.account_id
            LEFT JOIN files f ON a.avatar_file_id = f.file_id
            WHERE a.type = 'User' AND LOWER(a.status) = 'active' AND a.deleted_at IS NULL
            ORDER BY u.user_id DESC
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return result.rows;
    } catch (err) {
        console.error('Error fetching recent user avatars:', err);
        throw err;
    }
}

async function followUser(followerId, followedId) {
    try {
        const query = `
            INSERT INTO account_followers (follower_id, followed_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            RETURNING *;
        `;
        const result = await pool.query(query, [followerId, followedId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error following user ${followedId}:`, err);
        throw err;
    }
}

async function unfollowUser(followerId, followedId) {
    try {
        const query = `
            DELETE FROM account_followers
            WHERE follower_id = $1 AND followed_id = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [followerId, followedId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error unfollowing user ${followedId}:`, err);
        throw err;
    }
}

async function getFollowers(accountId) {
    try {
        const query = `
            SELECT 
                a.account_id,
                a.display_name,
                a.handle,
                f.path AS avatar_preset_url
            FROM account_followers af
            INNER JOIN accounts a ON a.account_id = af.follower_id
            LEFT JOIN files f ON f.file_id = a.avatar_file_id
            WHERE af.followed_id = $1
            ORDER BY af.created_at DESC;
        `;
        const result = await pool.query(query, [accountId]);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching followers for ${accountId}:`, err);
        throw err;
    }
}

async function getFollowing(accountId) {
    try {
        const query = `
            SELECT 
                a.account_id,
                a.display_name,
                a.handle,
                f.path AS avatar_preset_url
            FROM account_followers af
            INNER JOIN accounts a ON a.account_id = af.followed_id
            LEFT JOIN files f ON f.file_id = a.avatar_file_id
            WHERE af.follower_id = $1
            ORDER BY af.created_at DESC;
        `;
        const result = await pool.query(query, [accountId]);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching following for ${accountId}:`, err);
        throw err;
    }
}

async function checkIsFollowing(followerId, followedId) {
    if (!followerId || !followedId) return false;
    try {
        const query = `
            SELECT 
                EXISTS (SELECT 1 FROM account_followers WHERE follower_id = $1 AND followed_id = $2) AS is_following,
                EXISTS (SELECT 1 FROM account_followers WHERE follower_id = $2 AND followed_id = $1) AS is_followed_by
        `;
        const result = await pool.query(query, [followerId, followedId]);
        return {
            isFollowing: result.rows[0].is_following,
            isFollowedBy: result.rows[0].is_followed_by
        };
    } catch (err) {
        console.error('Error checking follow status:', err);
        throw err;
    }
}

async function getAccountBadges(accountId) {
    try {
        const query = `
            SELECT b.registry_id, ab.display_order
            FROM account_badges ab
            JOIN badges b ON b.badge_id = ab.badge_id
            WHERE ab.account_id = $1
        `;
        const result = await pool.query(query, [accountId]);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching badges for account ${accountId}:`, err);
        throw err;
    }
}

async function grantBadgeToAccount(accountId, registryId, displayOrder = null) {
    try {
        const query = `
            INSERT INTO account_badges (account_id, badge_id, display_order)
            SELECT $1, badge_id, $3
            FROM badges
            WHERE registry_id = $2
            ON CONFLICT DO NOTHING
        `;
        await pool.query(query, [accountId, registryId, displayOrder]);
    } catch (err) {
        console.error(`Error granting badge ${registryId} to account ${accountId}:`, err);
        throw err;
    }
}

async function updateAccountBadgeDisplayOrder(accountId, registryIds) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // First, clear all display_order for this account
        await client.query(`
            UPDATE account_badges
            SET display_order = NULL
            WHERE account_id = $1
        `, [accountId]);

        // Then, update the display_order for the selected badges
        for (let i = 0; i < registryIds.length; i++) {
            await client.query(`
                UPDATE account_badges
                SET display_order = $1
                FROM badges
                WHERE account_badges.badge_id = badges.badge_id
                  AND account_badges.account_id = $2
                  AND badges.registry_id = $3
            `, [i + 1, accountId, registryIds[i]]);
        }
        
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error updating badge display order for account ${accountId}:`, err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    getAllAccounts,
    getAccountById,
    createAccount,
    getAccountByHandle,
    searchUserAccountsByHandle,
    getAccountWalletRepositories,
    checkAccountId,
    getProfileRepositories,
    getAccountLinkByAccountIdRepositories,
    checkUserAccountIdRepositories,
    getDisplayNameByAccountId,
    updateAndInsertAccountProfile,
    updateAccountProfile,
    getRecentUserAvatarsRepositories,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    checkIsFollowing,
    getAccountBadges,
    grantBadgeToAccount,
    updateAccountBadgeDisplayOrder
};
