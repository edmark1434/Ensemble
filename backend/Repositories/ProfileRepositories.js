const { pool } = require('../lib/database');

async function updateProfileAccountRepositories(accountId, updates) {
    try {
        // If no updates, return early
        if (!updates || Object.keys(updates).length === 0) {
            return { rows: [] };
        }

        // Build the SET clause dynamically
        const setClauses = [];
        const values = [];
        let index = 1;

        // Loop through the updates object to build the SET clause
        for (const [key, value] of Object.entries(updates)) {
            // Skip undefined or null values
            if (value === undefined || value === null) continue;
            
            // Convert camelCase to snake_case for database columns
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            setClauses.push(`${dbKey} = $${index}`);
            values.push(value);
            index++;
        }

        // If no valid updates after filtering, return early
        if (setClauses.length === 0) {
            return { rows: [] };
        }

        // Add accountId as the last parameter
        values.push(accountId);

        const queryText = `
            UPDATE accounts 
            SET ${setClauses.join(', ')} 
            WHERE account_id = $${index}
            RETURNING tagline, description, display_name
        `;

        const result = await pool.query(queryText, values);
        return result;
    } catch (err) {
        console.error(`Error updating profile account for accountId ${accountId}:`, err);
        throw err;
    }
}

async function updateProfileUserByAccountIdRepositories(accountId, updates) {
    try {
        // If no updates, return early
        if (!updates || Object.keys(updates).length === 0) {
            return { rows: [] };
        }

        // Build the SET clause dynamically
        const setClauses = [];
        const values = [];
        let index = 1;

        // Loop through the updates object to build the SET clause
        for (const [key, value] of Object.entries(updates)) {
            // Skip undefined or null values
            if (value === undefined || value === null) continue;
            
            // Convert camelCase to snake_case for database columns
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            setClauses.push(`${dbKey} = $${index}`);
            values.push(value);
            index++;
        }

        // If no valid updates after filtering, return early
        if (setClauses.length === 0) {
            return { rows: [] };
        }

        // Add accountId as the last parameter
        values.push(accountId);

        const queryText = `
            UPDATE users 
            SET ${setClauses.join(', ')} 
            WHERE account_id = $${index}
            RETURNING birth_date, country, zip_code, address
        `;

        const result = await pool.query(queryText, values);
        return result;
    } catch (err) {
        console.error(`Error updating profile user for accountId ${accountId}:`, err);
        throw err;
    }
}
async function updateProfileUserRepositories(userId, updates) {
    try {
        // Build the SET clause dynamically
        const setClauses = [];
        const values = [];
        let index = 1;

        // Loop through the updates object to build the SET clause
        for (const [key, value] of Object.entries(updates)) {
            // Convert camelCase to snake_case for database columns
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            setClauses.push(`${dbKey} = $${index}`);
            values.push(value);
            index++;
        }

        // Add userId as the last parameter
        values.push(userId);

        const queryText = `
            UPDATE users 
            SET ${setClauses.join(', ')} 
            WHERE user_id = $${index}
        `;

        const result = await pool.query(queryText, values);
        return result;
    } catch (err) {
        console.error(`Error updating profile account for userId ${userId}:`, err);
        throw err;
    }
}



async function insertProfileSocialMediaRepositories(accountId, listOfSocialMedia) {
    try {
        if (listOfSocialMedia.length === 0) return null;

        // Build the query for PostgreSQL bulk insert
        const values = [];
        const placeholders = [];
        let index = 1;

        listOfSocialMedia.forEach((link) => {
            // Assuming link has platform and url fields
            placeholders.push(`($${index}, $${index + 1}, $${index + 2})`);
            values.push(accountId, link.platform, link.url);
            index += 3;
        });

        const queryText = `INSERT INTO account_link(account_id, platform, url) VALUES ${placeholders.join(', ')}`;
        
        const response = await pool.query(queryText, values);
        return response;
    } catch (err) {
        console.error(`Error inserting profile social media for accountId ${accountId}:`, err);
        throw err;
    }
}



async function updateTaglineAndDescriptionRepositories(accountId, tagline, description) {
    try {
        const queryText = `UPDATE ACCOUNTS SET TAGLINE = $1 , DESCRIPTION = $2 WHERE ACCOUNT_ID = $3`;
        const values = [tagline, description, accountId];
        const result = await pool.query(queryText, values);
        return result;
    } catch (err) {
        console.error(`Error updating tagline and description for accountId ${accountId}:`, err);
        throw err;
    }
}


async function getPersonalDetails(userId) {
    try {
        const result = await pool.query('SELECT middle_name,suffix,birth_date, country, zip_code, address FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching personal details for userId ${userId}:`, err);
        throw err;
    }
}

async function getProfileByAccountId(accountId) { 
    try {
        // 1. Get profile data
        const profileQuery = `
            SELECT 
                A.HANDLE AS username, 
                U.FIRST_NAME || ' ' || U.LAST_NAME AS name, 
                U.MIDDLE_NAME as middleName, 
                U.SUFFIX as suffix,
                A.TAGLINE as tagline,
                U.EMAIL_ADDRESS as email_address, 
                A.CREATED_AT AS joinedDate, 
                TO_CHAR(u.birth_date, 'YYYY-MM-DD') as birthdate, 
                U.COUNTRY as country,
                U.ZIP_CODE as zipCode,
                U.ADDRESS as location,
                A.MERIT_SCORE as merit_Score,
                A.AVATAR_FILE_ID as avatar_file_id,
                A.DESCRIPTION as bio,
                F.PATH AS avatar_preset_url,
                P.NAME AS subscriptionType,
                U.USER_ID as user_id,
                V.IS_VERIFIED AS verification_status
            FROM ACCOUNTS A
            JOIN USERS U ON A.ACCOUNT_ID = U.ACCOUNT_ID
            JOIN VERIFICATIONS V ON A.ACCOUNT_ID = V.ACCOUNT_ID
            LEFT JOIN FILES F ON A.AVATAR_FILE_ID = F.FILE_ID
            LEFT JOIN SUBSCRIPTIONS S ON U.USER_ID = S.USER_ID
            LEFT JOIN PLANS P ON S.PLAN_ID = P.PLAN_ID
            WHERE A.ACCOUNT_ID = $1
        `;
        
        const profileResult = await pool.query(profileQuery, [accountId]);
        
        if (profileResult.rows.length === 0) {
            return null;
        }
        
        const profile = profileResult.rows[0];
        
        // 2. Get roles
        const rolesQuery = `
            SELECT 
                P.PLPU_ID AS "role_id",
                P.PURPOSE_NAME AS "role_name"
            FROM user_platform_purpose UP
            JOIN platform_purpose P ON UP.PLPU_ID = P.PLPU_ID
            WHERE UP.USER_ID = $1
        `;
        
        const rolesResult = await pool.query(rolesQuery, [profile.user_id]);
        profile.roles = rolesResult.rows;
        
        return profile;
    } catch (err) {
        console.error(`Error fetching profile for accountId ${accountId}:`, err);
        throw err;
    }
}

async function updateProfileSocialMediaRepositories(accountId, socialMediaUpdates) {
    try {
        if (socialMediaUpdates.length === 0) return [];

        // Build a single query with CASE statements
        let platformCases = [];
        let urlCases = [];
        const ids = [];
        let index = 1;

        for (const link of socialMediaUpdates) {
            platformCases.push(`WHEN account_link_id = $${index} THEN $${index + 1}`);
            urlCases.push(`WHEN account_link_id = $${index} THEN $${index + 2}`);
            ids.push(link.account_link_id);
            index += 3;
        }

        const queryText = `
            UPDATE account_link 
            SET 
                platform = CASE ${platformCases.join(' ')} END,
                url = CASE ${urlCases.join(' ')} END
            WHERE account_id = $${index} 
            AND account_link_id = ANY($${index + 1}::int[])
            RETURNING *
        `;

        // Prepare values: for each link, add [id, platform, url]
        const values = [];
        for (const link of socialMediaUpdates) {
            values.push(link.account_link_id, link.platform, link.url);
        }
        values.push(accountId, ids);

        const result = await pool.query(queryText, values);
        return result.rows;
    } catch (err) {
        console.error(`Error updating profile social media for accountId ${accountId}:`, err);
        throw err;
    }
}

async function deleteProfileSocialMediaRepositories(accountId, listOfSocialMediaIds) {
    try {
        if (listOfSocialMediaIds.length === 0) return null;
        
        // Extract IDs if they're objects
        const ids = listOfSocialMediaIds.map(item => 
            typeof item === 'object' ? item.account_link_id : item
        );
        
        // Build parameterized placeholders
        const placeholders = ids.map((_, index) => `$${index + 2}`).join(', ');
        const queryText = `DELETE FROM account_link WHERE account_id = $1 AND account_link_id IN (${placeholders})`;
        const result = await pool.query(queryText, [accountId, ...ids]);
        
        return {
            success: true,
            deletedCount: result.rowCount,
            deletedIds: ids
        };
    } catch (err) {
        console.error(`Error deleting profile social media for accountId ${accountId}:`, err);
        throw err;
    }
}

async function getProfileAvatarsByAccountId(accountId) {
    try{
        const queryText = `SELECT f.file_id,f.name, f.path from account_profile_files apf 
        JOIN files f ON apf.file_id = f.file_id WHERE account_id = $1`;
        const result = await pool.query(queryText, [accountId]);
        return result.rows;
    }catch(err){
        console.error(`Error fetching profile avatars for accountId ${accountId}:`, err);
        throw err;
    }
}

async function getProfileCurrentAvatarByAccountId(accountId){
    try{
        const queryText = `SELECT f.file_id,f.name, f.path from accounts a
        JOIN files f ON a.avatar_file_id = f.file_id
        WHERE a.account_id = $1`;
        const result = await pool.query(queryText, [accountId]);
        return result.rows[0];
    }catch(err){
        console.error(`Error fetching current profile avatar for accountId ${accountId}:`, err);
        throw err;
    }
}

async function getEmailAddressByAccountId(accountId) {
    try {
        const result = await pool.query('SELECT email_address FROM users WHERE account_id = $1', [accountId]);
        return result.rows[0] || null;
    } catch (err) {
        console.error(`Error fetching email address for accountId ${accountId}:`, err);
        throw err;
    }
}

module.exports = {
    updateProfileAccountRepositories,
    insertProfileSocialMediaRepositories,
    updateTaglineAndDescriptionRepositories,
    getPersonalDetails,
    updateProfileUserRepositories,
    updateProfileUserByAccountIdRepositories,
    getProfileByAccountId,
    updateProfileSocialMediaRepositories,
    deleteProfileSocialMediaRepositories,
    getProfileAvatarsByAccountId,
    getProfileCurrentAvatarByAccountId,
    getEmailAddressByAccountId
};