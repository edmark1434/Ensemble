const { pool } = require('../lib/database');

async function getReusableAccountVerificationSessionByUserId(userId) {
    try {
        const query = `
            SELECT *
            FROM account_verification_sessions
            WHERE user_id = $1
            AND status IN (
                'Not Started',
                'In Progress',
                'Awaiting User',
                'In Review',
                'Resubmitted'
            )
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const { rows } = await pool.query(query, [userId]);

        return rows[0] || null;
    } catch (err) {
        console.error("Error fetching reusable account verification session:", err);
        throw err;
    }
}

async function createAccountVerificationSessionRepository({
    user_id,
    didit_session_id,
    verification_url,
    status,
    expires_at = null,
}) {
    try {
        const query = `
            INSERT INTO account_verification_sessions (
                user_id,
                didit_session_id,
                verification_url,
                status,
                expires_at
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const values = [
            user_id,
            didit_session_id,
            verification_url,
            status,
            expires_at,
        ];

        const { rows } = await pool.query(query, values);

        return rows[0];
    } catch (err) {
        console.error("Error creating account verification session:", err);
        throw err;
    }
}

module.exports = {
    getReusableAccountVerificationSessionByUserId,
    createAccountVerificationSessionRepository,
};