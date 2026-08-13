const { pool } = require('../lib/Database');


async function getAllProfileFilesRepositories() {
    try {
        const query = `SELECT f.file_id, f.name, f.path from system_files as s inner join files as f on s.file_id = f.file_id where s.category = 'profile'`;
        const { rows } = await pool.query(query);
        return rows;
    } catch (err) {
        console.log('Error fetching profile files:', err);
        throw err;
    }
}



async function createFileRepository(name, path, mime_type, size_bytes) {
    try {
        const query = `
            INSERT INTO files (name, path, mime_type, size_bytes)
            VALUES ($1, $2, $3, $4)
            RETURNING file_id
        `;
        const { rows } = await pool.query(query, [name, path, mime_type, size_bytes]);
        return rows[0].file_id;
    } catch (err) {
        console.error('Error creating file:', err);
        throw err;
    }
}

async function createUploadIntentRepository(data) {
    const { rows } = await pool.query(
        `INSERT INTO upload_intents
            (account_id, original_name, staging_key, final_key, expected_mime_type, max_size_bytes, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING upload_intent_id, expires_at`,
        [data.accountId, data.originalName, data.stagingKey, data.finalKey, data.expectedMimeType, data.maxSizeBytes, data.expiresAt]
    );
    return rows[0];
}

async function getUploadIntentForOwnerRepository(intentId, accountId) {
    const { rows } = await pool.query(
        `SELECT upload_intent_id, account_id, original_name, staging_key, final_key,
                expected_mime_type, max_size_bytes, expires_at, status, consumed_at, file_id
         FROM upload_intents WHERE upload_intent_id = $1 AND account_id = $2`,
        [intentId, accountId]
    );
    return rows[0] || null;
}

async function claimUploadIntentRepository(intentId, accountId) {
    const { rows } = await pool.query(
        `UPDATE upload_intents SET status = 'finalizing'
         WHERE upload_intent_id = $1 AND account_id = $2 AND status = 'pending'
           AND consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP
         RETURNING upload_intent_id, account_id, original_name, staging_key, final_key,
                   expected_mime_type, max_size_bytes, expires_at`,
        [intentId, accountId]
    );
    return rows[0] || null;
}

async function releaseUploadIntentRepository(intentId, accountId) {
    await pool.query(
        `UPDATE upload_intents SET status = 'pending'
         WHERE upload_intent_id = $1 AND account_id = $2 AND status = 'finalizing' AND consumed_at IS NULL`,
        [intentId, accountId]
    );
}

async function consumeUploadIntentRepository(intentId, accountId, fileData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const locked = await client.query(
            `SELECT consumed_at, expires_at, final_key, status FROM upload_intents
             WHERE upload_intent_id = $1 AND account_id = $2 FOR UPDATE`,
            [intentId, accountId]
        );
        const intent = locked.rows[0];
        if (!intent) { const error = new Error('UPLOAD_INTENT_NOT_FOUND'); error.code = 'UPLOAD_INTENT_NOT_FOUND'; throw error; }
        if (intent.consumed_at) { const error = new Error('UPLOAD_INTENT_CONSUMED'); error.code = 'UPLOAD_INTENT_CONSUMED'; throw error; }
        if (intent.status !== 'finalizing') { const error = new Error('UPLOAD_INTENT_NOT_CLAIMED'); error.code = 'UPLOAD_INTENT_NOT_CLAIMED'; throw error; }
        if (new Date(intent.expires_at).getTime() <= Date.now()) { const error = new Error('UPLOAD_INTENT_EXPIRED'); error.code = 'UPLOAD_INTENT_EXPIRED'; throw error; }
        const inserted = await client.query(
            `INSERT INTO files (name, path, mime_type, size_bytes) VALUES ($1, $2, $3, $4) RETURNING file_id`,
            [fileData.name, intent.final_key, fileData.mimeType, fileData.sizeBytes]
        );
        const fileId = inserted.rows[0].file_id;
        await client.query(
            `UPDATE upload_intents SET status = 'consumed', consumed_at = CURRENT_TIMESTAMP, file_id = $3
             WHERE upload_intent_id = $1 AND account_id = $2`,
            [intentId, accountId, fileId]
        );
        await client.query('COMMIT');
        return { fileId, key: intent.final_key };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    getAllProfileFilesRepositories,
    createFileRepository,
    createUploadIntentRepository,
    getUploadIntentForOwnerRepository,
    claimUploadIntentRepository,
    releaseUploadIntentRepository,
    consumeUploadIntentRepository
}
