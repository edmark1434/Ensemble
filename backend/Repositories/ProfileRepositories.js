const { pool } = require('../lib/database');

async function updateProfileAccountRepositories(accountId, updates) {
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

        // Add accountId as the last parameter
        values.push(accountId);

        const queryText = `
            UPDATE accounts 
            SET ${setClauses.join(', ')} 
            WHERE account_id = $${index}
        `;

        const result = await pool.query(queryText, values);
        return result;
    } catch (err) {
        console.error(`Error updating profile account for accountId ${accountId}:`, err);
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


async function insertProfileSkillsRepositories(userId, listOfSkills) {
    try {
        if (listOfSkills.length === 0) return null;

        const values = [];
        const placeholders = [];
        let index = 1;

        listOfSkills.forEach((skill) => {
            placeholders.push(`($${index}, $${index + 1})`);
            values.push(userId, skill.tag_id);
            index += 2;
        });

        const queryText = `INSERT INTO user_tags(user_id, tag_id) VALUES ${placeholders.join(', ')}`;
        
        // This will execute: INSERT INTO user_tags(user_id, tag_id) VALUES ($1, $2)
        const response = await pool.query(queryText, values);
        return response;
    } catch (err) {
        console.error(`Error inserting profile skills for userId ${userId}:`, err);
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

async function deleteProfileSkillsRepositories(userId, listOfSkills) {
    try {
        if (listOfSkills.length === 0) return null;

        const tagIds = listOfSkills.map(skill => skill.tag_id);

        const placeholders = tagIds.map((_, index) => `$${index + 2}`).join(', ');

        const queryText = `
            DELETE FROM user_tags
            WHERE user_id = $1
            AND tag_id IN (${placeholders})
        `;

        const values = [userId, ...tagIds];

        const response = await pool.query(queryText, values);
        return response;
    } catch (err) {
        console.error(`Error deleting profile skills for userId ${userId}:`, err);
        throw err;
    }
}

async function deleteProfileSocialMediaRepositories(accountId, listOfSocialMedia) {
    try {
        if (listOfSocialMedia.length === 0) return null;

        // Extract the account_link_ids to delete
        const linkIds = listOfSocialMedia.map(link => link.account_link_id);

        // Filter out any undefined or null values (new items that haven't been saved yet)
        const validLinkIds = linkIds.filter(id => id !== undefined && id !== null);
        
        if (validLinkIds.length === 0) return null;

        const placeholders = validLinkIds.map((_, index) => `$${index + 2}`).join(', ');

        const queryText = `
            DELETE FROM account_link
            WHERE account_id = $1
            AND account_link_id IN (${placeholders})
        `;

        const values = [accountId, ...validLinkIds];

        const response = await pool.query(queryText, values);
        return response;
    } catch (err) {
        console.error(`Error deleting profile social media for accountId ${accountId}:`, err);
        throw err;
    }
}

// ============================================
// NEW: Update Social Media URLs (Bulk)
// ============================================
async function updateProfileSocialMediaRepositories(accountId, listOfSocialMedia) {
    try {
        if (listOfSocialMedia.length === 0) return null;

        // Using a single query with CASE statements for bulk update (more efficient)
        // OR we can use multiple updates in a transaction
        // Let's use the simpler approach with multiple updates
        const results = [];
        for (const link of listOfSocialMedia) {
            const queryText = `
                UPDATE account_link 
                SET url = $1, platform = $2
                WHERE account_link_id = $3 AND account_id = $4
            `;
            const values = [link.url, link.platform, link.account_link_id, accountId];
            const result = await pool.query(queryText, values);
            results.push(result);
        }
        
        return results;
    } catch (err) {
        console.error(`Error updating profile social media for accountId ${accountId}:`, err);
        throw err;
    }
}

// ============================================
// OPTIONAL: Bulk Update using a single query (more efficient for many records)
// ============================================
async function updateProfileSocialMediaRepositoriesBulk(accountId, listOfSocialMedia) {
    try {
        if (listOfSocialMedia.length === 0) return null;

        // Build CASE statements for bulk update
        const values = [];
        let index = 1;
        const idPlaceholders = [];
        const urlCases = [];
        const platformCases = [];

        listOfSocialMedia.forEach((link) => {
            idPlaceholders.push(`$${index}`);
            urlCases.push(`WHEN $${index} THEN $${index + 1}`);
            platformCases.push(`WHEN $${index} THEN $${index + 2}`);
            values.push(link.account_link_id, link.url, link.platform);
            index += 3;
        });

        // Add account_id as the last parameter
        values.push(accountId);

        const queryText = `
            UPDATE account_link 
            SET 
                url = CASE account_link_id 
                    ${urlCases.join(' ')}
                    ELSE url
                END,
                platform = CASE account_link_id 
                    ${platformCases.join(' ')}
                    ELSE platform
                END
            WHERE account_id = $${values.length}
            AND account_link_id IN (${idPlaceholders.join(', ')})
        `;

        const result = await pool.query(queryText, values);
        return result;
    } catch (err) {
        console.error(`Error updating profile social media in bulk for accountId ${accountId}:`, err);
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

async function getProfileByUserId(userId) { 
    try {
        // 1. Get profile data
        const profileQuery = `
            SELECT 
                A.HANDLE AS username, 
                A.DISPLAY_NAME as name, 
                U.MIDDLE_NAME as middleName, 
                U.SUFFIX as suffix,
                A.TAGLINE as tagline,
                U.EMAIL_ADDRESS as email_address, 
                A.CREATED_AT AS joinedDate, 
                U.BIRTH_DATE as birthDate, 
                U.COUNTRY as country,
                U.ZIP_CODE as zipCode,
                U.ADDRESS as location,
                A.MERIT_SCORE as merit_Score,
                A.AVATAR_FILE_ID as avatar_file_id,
                A.DESCRIPTION as bio,
                F.PATH AS avatar_preset_url,
                P.NAME AS subscriptionType
            FROM ACCOUNTS A
            JOIN USERS U ON A.ACCOUNT_ID = U.ACCOUNT_ID
            LEFT JOIN FILES F ON A.AVATAR_FILE_ID = F.FILE_ID
            LEFT JOIN SUBSCRIPTIONS S ON U.USER_ID = S.USER_ID
            LEFT JOIN PLANS P ON S.PLAN_ID = P.PLAN_ID
            WHERE U.USER_ID = $1
        `;
        
        const profileResult = await pool.query(profileQuery, [userId]);
        
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
        
        const rolesResult = await pool.query(rolesQuery, [userId]);
        profile.roles = rolesResult.rows;
        
        return profile;
    } catch (err) {
        console.error(`Error fetching profile for userId ${userId}:`, err);
        throw err;
    }
}


module.exports = {
    updateProfileAccountRepositories,
    insertProfileSkillsRepositories,
    insertProfileSocialMediaRepositories,
    deleteProfileSkillsRepositories,
    deleteProfileSocialMediaRepositories,
    updateProfileSocialMediaRepositories,        
    updateProfileSocialMediaRepositoriesBulk,
    updateTaglineAndDescriptionRepositories,
    getPersonalDetails,
    updateProfileUserRepositories,
    getProfileByUserId
};