const { pool } = require('../lib/Database');

// User repository functions for interacting with the users table in the database
async function getAllUsers() {
    try {
        const result = await pool.query(`
            SELECT u.user_id, u.account_id, u.first_name, u.last_name,
                   a.display_name, a.handle, a.type, a.status
            FROM users u
            INNER JOIN accounts a ON a.account_id = u.account_id
            WHERE u.deleted_at IS NULL AND a.deleted_at IS NULL
        `);
        return result.rows;
    } catch (err) {
        console.error('Error fetching users:', err);
        throw err;
    }
}

// Fetch a user by their unique user ID
async function getUserById(userId) {
    try {
        const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching user with id ${userId}:`, err);
        throw err;
    }
}

async function getNameByUserId(userId) {
    try {
        const result = await pool.query('SELECT first_name, last_name FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching name for user with id ${userId}:`, err);
        throw err;
    }
}

async function getUserByListofIdsRepositories(userIds) { 
    try {
        const {rows} = await pool.query(`SELECT json_agg(user_data) as users_list FROM (SELECT user_id,first_name, last_name,f.path FROM users
            inner join accounts as a on users.account_id = a.account_id
            inner join files as f on a.avatar_file_id = f.file_id
            WHERE user_id = ANY($1)) as user_data`, [userIds]);
        return rows[0].users_list || [];
    }catch (err) {
        console.error(`Error fetching users with ids ${userIds}:`, err);
        throw err;
    }
}

// Create a new user in the database with the provided details and return the created user
async function createUser({
    account_id = null,
    firstName = null,
    lastName = null,
    emailAddress,
    passwordHash,
    firebaseUserUuid = null,
    isEmailVerified = false,
}) {
    try {
        const result = await pool.query(
            `INSERT INTO users (
                account_id,
                first_name,
                last_name,
                email_address,
                password_hash,
                firebase_user_uuid,
                is_email_verified
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING user_id, first_name, last_name, email_address, firebase_user_uuid`,
            [
                account_id,
                firstName,
                lastName,
                emailAddress,
                passwordHash,
                firebaseUserUuid,
                isEmailVerified
            ]
        );
        return result.rows[0];
    } catch (err) {
        console.error('Error creating user:', err);
        throw err;
    }
}
// Fetch a user by their email address, returning the email and Firebase UUID if found
async function getUserByEmail(email) {
    try{
        const result = await pool.query('SELECT email_address,firebase_user_uuid FROM users WHERE email_address = $1', [email]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching user with email ${email}:`, err);
        throw err;
    }
}
// Fetch a user by their email address, returning the email and password hash if found
async function getEmailandPasswordHashByEmail(email) {
    try{
        const result = await pool.query(
            `SELECT u.user_id, u.email_address, u.password_hash , a.handle, a.account_id, a.display_name, a.type
             FROM users u
             INNER JOIN accounts a ON a.account_id = u.account_id
             WHERE u.email_address = $1`,
            [email]
        );
        return result.rows[0];
    }catch(err){
        console.error(`Error fetching user with email ${email}:`, err);
        throw err;
    }
}
// Fetch a user by their username (account handle), returning the email and password hash if found
async function getEmailandPasswordHashByUsername(username) {
    try{
        const result = await pool.query(
            `SELECT u.user_id, u.email_address, u.password_hash, a.type, a.handle, a.account_id, a.display_name
             FROM users u
             INNER JOIN accounts a ON a.account_id = u.account_id
             WHERE a.handle = $1`,
            [username]
        );
        return result.rows[0];
    }catch(err){
        console.error(`Error fetching user with username ${username}:`, err);
        throw err;
    }
}
// Update the Firebase user UUID for a user identified by their email address, returning the updated user ID
async function updateFirebaseUserUuid(email, firebaseUserUuid) {
    try {
        const result = await pool.query(
            'UPDATE users SET firebase_user_uuid = $1 WHERE email_address = $2 RETURNING user_id',
            [firebaseUserUuid, email]
        );
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating Firebase user UUID for user ${email}:`, err);
        throw err;
    }
}

async function getUserTag(userId) {
    try{
        const queryText = `SELECT T.TAG_ID, T.NAME FROM USER_TAG UT 
        INNER JOIN TAG T ON UT.TAG_ID = T.TAG_ID WHERE UT.USER_ID = $1`;
        const result = await pool.query(queryText, [userId]);
        return result.rows;
    }catch(err){
        console.error(`Error fetching user tag for user ${userId}:`, err);
        throw err;
    }
}

async function createUserTag(userId, tags) {
    if (!tags || tags.length === 0) return 0;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Build placeholders for the tags: ($1, NOW()), ($2, NOW())...
        const tagPlaceholders = tags.map((_, i) => `($${i + 1}, NOW())`).join(', ');
        
        // The magic happens here: ON CONFLICT ensures duplicates are not saved, 
        // but RETURNING tag_id still gives us EVERY tag's ID (new and old).
        const tagQueryText = `
            INSERT INTO TAG (NAME, CREATED_AT) 
            VALUES ${tagPlaceholders} 
            ON CONFLICT (NAME) DO UPDATE SET NAME = EXCLUDED.NAME
            RETURNING tag_id;
        `;
        
        const result = await client.query(tagQueryText, tags);
        const tagIds = result.rows.map(row => row.tag_id);

        // 2. Build placeholders for USER_TAG table
        const userTagPlaceholders = [];
        const userTagValues = [];
        
        tagIds.forEach((tagId, index) => {
            userTagPlaceholders.push(`($${index * 2 + 1}, $${index * 2 + 2})`);
            userTagValues.push(userId, tagId);
        });

        // Use ON CONFLICT here too, so a user can't be linked to the same tag twice
        const userTagQueryText = `
            INSERT INTO USER_TAG (USER_ID, TAG_ID) 
            VALUES ${userTagPlaceholders.join(', ')}
            ON CONFLICT DO NOTHING
        `;
        
        const result2 = await client.query(userTagQueryText, userTagValues);
        
        await client.query('COMMIT');
        return result2.rowCount; // Returns how many NEW links were made
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error creating user tag for user ${userId}:`, err);
        throw err;
    } finally {
        client.release();
    }
}

async function getUserByIdFromAccountId(accountId) {
    try {
        const result = await pool.query('SELECT user_id FROM users WHERE account_id = $1', [accountId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching user with account id ${accountId}:`, err);
        throw err;
    }
}

async function updateUserDetails(userId, updates) {
    try {
        if (!userId) {
            throw new Error("userId is required.");
        }

        if (!updates || Object.keys(updates).length === 0) {
            throw new Error("No fields to update.");
        }

        const allowedColumns = new Set([
            'email_address',
            'address',
            'password_hash',
            'first_name',
            'middle_name',
            'last_name',
            'birth_date',
            'suffix',
        ]);
        const setClauses = [];
        const values = [];
        let index = 1;

        for (const [column, value] of Object.entries(updates)) {
            if (value === undefined) continue;
            if (!allowedColumns.has(column)) {
                throw new Error(`Unsupported user field: ${column}`);
            }

            setClauses.push(`${column} = $${index}`);
            values.push(value);
            index++;
        }

        // Always update updated_at
        values.push(userId);

        const query = `
            UPDATE users
            SET ${setClauses.join(", ")}
            WHERE user_id = $${index}
            RETURNING *;
        `;

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (err) {
        console.error("Error updating user:", err);
        throw err;
    }
}
async function updateUserDetailsByAccountId(accountId, updates) {
    try {
        if (!accountId) {
            throw new Error("accountId is required.");
        }

        if (!updates || Object.keys(updates).length === 0) {
            throw new Error("No fields to update.");
        }

        const setClauses = [];
        const values = [];
        let index = 1;

        for (const [column, value] of Object.entries(updates)) {
            if (value === undefined) continue;

            setClauses.push(`${column} = $${index}`);
            values.push(value);
            index++;
        }

        if (setClauses.length === 0) {
            return null;
        }

        values.push(accountId);

        const query = `
            UPDATE users
            SET ${setClauses.join(", ")}
            WHERE account_id = $${index}
            RETURNING *;
        `;

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (err) {
        console.error("Error updating user:", err);
        throw err;
    }
}

async function getUserOnboardingStep(userId) {
    try {
        const result = await pool.query('SELECT completed_onboarding FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    } catch (err) {
        console.error("Error fetching user onboarding step:", err);
        throw err;
    }
}

//exports all the repository functions for use in other parts of the application
module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    getUserByEmail,
    getEmailandPasswordHashByEmail,
    getEmailandPasswordHashByUsername,
    updateFirebaseUserUuid,
    getUserByIdFromAccountId,
    getUserByListofIdsRepositories,
    getNameByUserId,
    updateUserDetails,
    updateUserDetailsByAccountId,
    getUserOnboardingStep,
};
