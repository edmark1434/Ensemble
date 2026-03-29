const client = require('../lib/database');

// User repository functions for interacting with the users table in the database
async function getAllUsers() {
    try {
        const result = await client.query('SELECT * FROM users');
        return result.rows;
    } catch (err) {
        console.error('Error fetching users:', err);
        throw err;
    }
}

// Fetch a user by their unique user ID
async function getUserById(userId) {
    try {
        const result = await client.query('SELECT * FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching user with id ${userId}:`, err);
        throw err;
    }
}

// Create a new user in the database with the provided details and return the created user
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
// Fetch a user by their email address, returning the email and Firebase UUID if found
async function getUserByEmail(email) {
    try{
        const result = await client.query('SELECT email_address,firebase_user_uuid FROM users WHERE email_address = $1', [email]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching user with email ${email}:`, err);
        throw err;
    }
}
// Fetch a user by their email address, returning the email and password hash if found
async function getEmailandPasswordHashByEmail(email) {
    try{
        const result = await client.query(
            `SELECT u.user_id, u.email_address, u.password_hash , a.handle, a.account_id, a.display_name
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
        const result = await client.query(
            `SELECT u.user_id, u.email_address, u.password_hash , a.handle, a.account_id, a.display_name
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
//exports all the repository functions for use in other parts of the application
module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    getUserByEmail,
    getEmailandPasswordHashByEmail,
    getEmailandPasswordHashByUsername,
    updateFirebaseUserUuid
};
