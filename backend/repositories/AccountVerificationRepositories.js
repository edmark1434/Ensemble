const { pool } = require("../lib/Database");

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
async function isAccountVerifiedByAccountId(accountId) {
    const result = await pool.query(
        `SELECT EXISTS (
            SELECT 1
            FROM verifications
            WHERE account_id = $1
              AND is_verified = TRUE
        ) AS is_verified`,
        [accountId]
    );

    return result.rows[0]?.is_verified === true;
}
async function getAccountVerificationStatusByAccountId(accountId) {
    try {
        const result = await pool.query(
            `
            SELECT
                v.is_verified,
                avs.expires_at
            FROM verifications AS v
            LEFT JOIN account_verification_sessions AS avs
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

async function getPendingDiditVerificationSessions(limit = 50) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const result = await pool.query(
        `SELECT *
         FROM account_verification_sessions
         WHERE verification_status IN ('Pending', 'In Review')
           AND didit_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         ORDER BY updated_at ASC NULLS FIRST, created_at ASC
         LIMIT $1`,
        [safeLimit]
    );
    return result.rows;
}

async function createVerificationAttachments(payload){
    try{
        const query = `
        INSERT INTO verification_attachments (VERIFICATION_ID , FILE_ID, DOCUMENT_TYPE, INDEX, CREATED_AT)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP);
        `;
        const values = [
            payload.verification_id,
            payload.file_id,
            payload.document_type,
            payload.index
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }catch(err){
        console.error("Error creating verification attachments:", err);
        throw err;
    }
}

async function createBusinessVerificationSubmissionRepository(
    accountId,
    submitterAccountId,
    businessDetails,
    documents
) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const verificationResult = await client.query(
            `INSERT INTO verifications (account_id, is_verified, verified_at)
             VALUES ($1, FALSE, NULL)
             ON CONFLICT (account_id)
             DO UPDATE SET
                is_verified = FALSE,
                verified_at = NULL,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [accountId]
        );
        const verification = verificationResult.rows[0];

        const sessionResult = await client.query(
            `INSERT INTO account_verification_sessions (
                account_id,
                didit_session_id,
                verification_url,
                kyc_status,
                verification_status,
                verified_by_account_id,
                expires_at
             )
             VALUES ($1, $2, $3, 'Not Applicable', 'Pending', NULL, NULL)
             ON CONFLICT (didit_session_id)
             DO UPDATE SET
                verification_status = 'Pending',
                verified_by_account_id = NULL,
                expires_at = NULL,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [
                accountId,
                `manual-business-${verification.verification_id}`,
                `/teams/business-verification/${verification.verification_id}`,
            ]
        );
        const verificationSession = sessionResult.rows[0];

        await client.query(
            `UPDATE verifications
             SET verification_session_id = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE verification_id = $1`,
            [verification.verification_id, verificationSession.verification_session_id]
        );

        await client.query(
            `UPDATE verification_attachments
             SET is_latest = FALSE
             WHERE verification_id = $1 AND is_latest = TRUE`,
            [verification.verification_id]
        );

        const detailsResult = await client.query(
            `INSERT INTO business_verification_details (
                verification_id,
                business_type,
                registered_business_name,
                registration_number,
                registration_country,
                relationship_to_business,
                submitted_by_account_id,
                submission_version
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
             ON CONFLICT (verification_id)
             DO UPDATE SET
                business_type = EXCLUDED.business_type,
                registered_business_name = EXCLUDED.registered_business_name,
                registration_number = EXCLUDED.registration_number,
                registration_country = EXCLUDED.registration_country,
                relationship_to_business = EXCLUDED.relationship_to_business,
                submitted_by_account_id = EXCLUDED.submitted_by_account_id,
                submission_version = business_verification_details.submission_version + 1,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [
                verification.verification_id,
                businessDetails.business_type,
                businessDetails.registered_business_name,
                businessDetails.registration_number,
                businessDetails.registration_country,
                businessDetails.relationship_to_business,
                submitterAccountId,
            ]
        );
        const savedDetails = detailsResult.rows[0];

        const attachmentIndexResult = await client.query(
            `SELECT COALESCE(MAX("index"), -1) + 1 AS next_index
             FROM verification_attachments
             WHERE verification_id = $1`,
            [verification.verification_id]
        );
        const firstAttachmentIndex = Number(
            attachmentIndexResult.rows[0].next_index
        );

        const attachments = [];
        for (let index = 0; index < documents.length; index += 1) {
            const document = documents[index];
            const file = document.file;
            const fileResult = await client.query(
                `INSERT INTO files (name, path, mime_type, size_bytes)
                 VALUES ($1, $2, $3, $4)
                 RETURNING file_id, name, path, mime_type, size_bytes`,
                [file.name, file.path, file.mime_type, file.size_bytes]
            );
            const savedFile = fileResult.rows[0];

            await client.query(
                `INSERT INTO verification_attachments
                    (verification_id, file_id, document_type, "index",
                     submission_version, is_latest, is_required)
                 VALUES ($1, $2, $3, $4, $5, TRUE, $6)`,
                [
                    verification.verification_id,
                    savedFile.file_id,
                    document.document_type,
                    firstAttachmentIndex + index,
                    savedDetails.submission_version,
                    document.is_required,
                ]
            );

            attachments.push({
                ...savedFile,
                document_type: document.document_type,
                index: firstAttachmentIndex + index,
                submission_version: savedDetails.submission_version,
                is_latest: true,
                is_required: document.is_required,
            });
        }

        await client.query("COMMIT");
        return {
            verification: {
                ...verification,
                verification_session_id: verificationSession.verification_session_id,
            },
            business_details: savedDetails,
            attachments,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
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
    isAccountVerifiedByAccountId,
    getAccountVerificationSessionsByAccountId,
    getAccountVerificationSessionBySessionId,
    getPendingDiditVerificationSessions,
    getAccountVerificationStatusByAccountId,
    createVerificationAttachments,
    createBusinessVerificationSubmissionRepository
};
