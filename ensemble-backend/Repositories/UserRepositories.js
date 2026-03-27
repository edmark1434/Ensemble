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
            RETURNING *`,
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

module.exports = {
    getAllUsers,
    getUserById,
    createUser
};