const client = require('../lib/database');

async function getAllUsers() {
    try {
        const result = await client.query('SELECT * FROM users');
        return result.rows;
    } catch (err) {
        console.error('Error fetching users:', err);
        throw err;
    }
}

async function getUserById(userId) {
    try {
        const result = await client.query('SELECT * FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching user with id ${userId}:`, err);
        throw err;
    }
}


async function createUser({
    accountId = null,
    firstName = null,
    lastName = null,
    emailAddress,
    passwordHash,
    lastSeenAt = null,
    firebaseUserUuid = null,
}) {
    try {
        const result = await client.query(
            `INSERT INTO users (
                account_id,
                first_name,
                last_name,
                email_address,
                password_hash,
                last_seen_at,
                firebase_user_uuid
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING user_id, first_name, last_name, email_address, firebase_user_uuid`,
            [
                accountId,
                firstName,
                lastName,
                emailAddress,
                passwordHash,
                lastSeenAt,
                firebaseUserUuid,
            ]
        );
        return result.rows[0];
    } catch (err) {
        console.error('Error creating user:', err);
        throw err;
    }
}

async function getUserByEmail(email) {
    try{
        const result = await client.query('SELECT email_address,firebase_user_uuid FROM users WHERE email_address = $1', [email]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching user with email ${email}:`, err);
        throw err;
    }
}

async function getEmailandPasswordHashByEmail(email) {
    try{
        const result = await client.query(
            `SELECT u.email_address, u.password_hash , a.handle, a.account_id, a.display_name
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
async function getEmailandPasswordHashByUsername(username) {
    try{
        const result = await client.query(
            `SELECT u.email_address, u.password_hash , a.handle, a.account_id, a.display_name
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
async function updateFirebaseUserUuid(email, firebaseUserUuid) {
    try {
        const result = await client.query(
            'UPDATE users SET firebase_user_uuid = $1 WHERE email_address = $2 RETURNING user_id',
            [firebaseUserUuid, email]
        );
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating Firebase user UUID for user ${email}:`, err);
        throw err;
    }
}

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    getUserByEmail,
    getEmailandPasswordHashByEmail,
    getEmailandPasswordHashByUsername,
    updateFirebaseUserUuid
};
