const { pool } = require("../lib/database");

async function getReusableAccountVerificationSessionByAccountId(accountId) {
    try {
        const query = `
            SELECT *
            FROM account_verification_sessions
            WHERE account_id = $1
            AND kyc_status IN (
                'Not Started',
                'In Progress',
                'Awaiting User',
                'In Review',
                'Resubmitted',
                'Approved',
                'Declined'
            )
            ORDER BY created_at DESC
            LIMIT 1;
        `;

        const { rows } = await pool.query(query, [accountId]);

        return rows[0] || null;
    } catch (err) {
        console.error("Error fetching reusable account verification session:", err);
        throw err;
    }
}

async function createAccountVerificationSessionRepository({
    account_id,
    didit_session_id,
    verification_url,
    kyc_status,
    expires_at = null,
}) {
    try {
        const query = `
            INSERT INTO account_verification_sessions (
                account_id,
                didit_session_id,
                verification_url,
                kyc_status,
                expires_at
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const values = [
            account_id,
            didit_session_id,
            verification_url,
            kyc_status,
            expires_at,
        ];

        const { rows } = await pool.query(query, values);

        return rows[0];
    } catch (err) {
        console.error("Error creating account verification session:", err);
        throw err;
    }
}


async function updateAccountVerificationSessionStatus(sessionId, payload) {
    try {
        if (!payload || Object.keys(payload).length === 0) {
            throw new Error("No fields provided to update.");
        }

        const fields = [];
        const values = [];
        let index = 1;

        for (const [key, value] of Object.entries(payload)) {
            fields.push(`${key} = $${index}`);
            values.push(value);
            index++;
        }

        // WHERE parameter
        values.push(sessionId);

        const query = `
            UPDATE account_verification_sessions
            SET
                ${fields.join(", ")},
                updated_at = CURRENT_TIMESTAMP
            WHERE didit_session_id = $${index}
            RETURNING *;
        `;

        const { rows } = await pool.query(query, values);

        return rows[0] || null;
    } catch (err) {
        console.error("Error updating account verification session status:", err);
        throw err;
    }
}

async function updateAccountVerificationSessionById(verificationSessionId, payload) {
    try {
        if (!payload || Object.keys(payload).length === 0) {
            throw new Error("No fields provided to update.");
        }

        const fields = [];
        const values = [];
        let index = 1;

        for (const [key, value] of Object.entries(payload)) {
            fields.push(`${key} = $${index}`);
            values.push(value);
            index++;
        }

        values.push(verificationSessionId);
        const query = `
            UPDATE account_verification_sessions
            SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE verification_session_id = $${index}
            RETURNING *;
        `;
        const { rows } = await pool.query(query, values);
        return rows[0] || null;
    } catch (err) {
        console.error("Error updating account verification session by local ID:", err);
        throw err;
    }
}

async function updateAccountVerifications(accountId,payload){
try {
        if (!payload || Object.keys(payload).length === 0) {
            throw new Error("No fields provided to update.");
        }

        const fields = [];
        const values = [];
        let index = 1;

        for (const [key, value] of Object.entries(payload)) {
            fields.push(`${key} = $${index}`);
            values.push(value);
            index++;
        }

        // WHERE parameter
        values.push(accountId);

        const query = `
            UPDATE verifications
            SET
                ${fields.join(", ")},
                updated_at = CURRENT_TIMESTAMP
            WHERE account_id = $${index}
            RETURNING *;
        `;

        const { rows } = await pool.query(query, values);

        return rows[0] || null;
    } catch (err) {
        console.error("Error updating account verification :", err);
        throw err;
    }
}


async function createAccountVerificationRepository(accountId){
    try{
        const query = `
            INSERT INTO verifications (
                account_id,
                created_at,
                updated_at
            ) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *;
        `
        const result = await pool.query(query, [
            accountId
        ]);
        return result.rows[0];
    }catch(err){
        console.error("Error creating account verification :", err);
        throw err;
    }
}

async function getAccountVerificationByAccountId(accountId) {
    try{
        const result = await pool.query('SELECT * FROM verifications WHERE account_id = $1 limit 1' , [accountId]);
        return result.rows[0] || null;
    }catch(err){
        console.error("Error fetching account verification by accountId:", err);
        throw err;
    }
}
async function getAccountVerificationStatusByAccountId(accountId) {
    try {
        const result = await pool.query(
            `
            SELECT
                v.is_verified,
                avs.expires_at
            FROM verifications AS v
            JOIN account_verification_sessions AS avs
                ON v.verification_session_id = avs.verification_session_id
            WHERE v.account_id = $1
            LIMIT 1
            `,
            [accountId]
        );

        return result.rows[0] || null;
    } catch (err) {
        console.error("Error fetching account verification by accountId:", err);
        throw err;
    }
}

async function getAccountVerificationSessionsByAccountId(accountId) {
    try {
        const result = await pool.query(
            `SELECT *
             FROM account_verification_sessions
             WHERE account_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [accountId]
        );

        return result.rows[0] || null;
    } catch (err) {
        console.error("Error fetching account verification session:", err);
        throw err;
    }
}

async function getAccountVerificationSessionBySessionId(sessionId) {
    try {
        const result = await pool.query(
            `SELECT *
             FROM account_verification_sessions
             WHERE didit_session_id = $1`,
            [sessionId]
        );
        return result.rows[0] || null;
    } catch (err) {
        console.error("Error fetching account verification session by sessionId:", err);
        throw err;
    }
}

module.exports = {
    getReusableAccountVerificationSessionByAccountId,
    createAccountVerificationSessionRepository,
    updateAccountVerificationSessionStatus,
    updateAccountVerificationSessionById,
    updateAccountVerifications,
    createAccountVerificationRepository,
    getAccountVerificationByAccountId,
    getAccountVerificationSessionsByAccountId,
    getAccountVerificationSessionBySessionId,
    getAccountVerificationStatusByAccountId
};
