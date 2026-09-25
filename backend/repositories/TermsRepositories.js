const { pool } = require('../lib/Database');

async function getAllTermsRepositories(accountId) {
    try {
        const query = `
            SELECT t.terms_id as id, t.terms_title, t.terms_description as terms_content, t.terms_type, t.account_id,
                   CASE 
                       WHEN t.account_id IS NOT NULL THEN t.is_default
                       WHEN t.account_id IS NULL AND NOT EXISTS (
                           SELECT 1 FROM terms_of_service custom 
                           WHERE custom.account_id = $1 AND custom.terms_type = t.terms_type AND custom.is_default = TRUE
                       ) THEN TRUE
                       ELSE FALSE
                   END as is_default,
                   (SELECT json_agg(json_build_object('contract_id', p.proposal_id, 'type', 'job', 'title', j.title)) FROM proposals p JOIN jobs j ON p.job_id = j.job_id WHERE p.terms_id = t.terms_id) as usage_contracts
            FROM terms_of_service t
            WHERE t.account_id IS NULL OR t.account_id = $1
            ORDER BY is_default DESC, t.created_at DESC;
        `;
        const res = await pool.query(query, [accountId]);
        return res.rows.map(row => ({
            ...row,
            terms_content: row.terms_content ? row.terms_content.replace(/\\n/g, "\n") : row.terms_content,
            usage_contracts: row.usage_contracts || []
        }));
    } catch (err) {
        console.error('Error in getAllTermsRepositories:', err);
        throw err;
    }
}

async function createTermsRepositories(accountId, termsData) {
    try {
        const query = `
            INSERT INTO terms_of_service (terms_title, terms_description, terms_type, account_id, is_default)
            VALUES ($1, $2, $3, $4, FALSE)
            RETURNING terms_id as id, terms_title, terms_description as terms_content, is_default, terms_type;
        `;
        const values = [termsData.terms_title, termsData.terms_content, termsData.terms_type || 'jobs', accountId];
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error in createTermsRepositories:', err);
        throw err;
    }
}

async function updateTermsRepositories(termsId, accountId, termsData) {
    try {
        const query = `
            UPDATE terms_of_service
            SET terms_title = $1, terms_description = $2, terms_type = $3
            WHERE terms_id = $4 AND account_id = $5
            RETURNING terms_id as id, terms_title, terms_description as terms_content, is_default, terms_type;
        `;
        const values = [termsData.terms_title, termsData.terms_content, termsData.terms_type || 'jobs', termsId, accountId];
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error in updateTermsRepositories:', err);
        throw err;
    }
}

async function deleteTermsRepositories(termsId, accountId) {
    try {
        const query = `
            DELETE FROM terms_of_service
            WHERE terms_id = $1 AND account_id = $2
            RETURNING terms_id;
        `;
        const res = await pool.query(query, [termsId, accountId]);
        return res.rows[0];
    } catch (err) {
        console.error('Error in deleteTermsRepositories:', err);
        throw err;
    }
}

async function setDefaultTermsRepository(termsId, accountId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const typeRes = await client.query('SELECT terms_type, account_id FROM terms_of_service WHERE terms_id = $1 AND (account_id = $2 OR account_id IS NULL)', [termsId, accountId]);
        if (typeRes.rows.length === 0) {
            throw new Error('Terms not found or unauthorized');
        }
        const { terms_type: termsType, account_id: templateAccountId } = typeRes.rows[0];

        // Unset any custom default for this type
        await client.query('UPDATE terms_of_service SET is_default = FALSE WHERE account_id = $1 AND terms_type = $2', [accountId, termsType]);
        
        let returnedRow;
        if (templateAccountId === null) {
            // Reverting to global default
            const res = await client.query('SELECT terms_id as id, terms_title, terms_description as terms_content, TRUE as is_default, terms_type FROM terms_of_service WHERE terms_id = $1', [termsId]);
            returnedRow = res.rows[0];
        } else {
            // Setting a custom default
            const res = await client.query('UPDATE terms_of_service SET is_default = TRUE WHERE terms_id = $1 RETURNING terms_id as id, terms_title, terms_description as terms_content, is_default, terms_type', [termsId]);
            returnedRow = res.rows[0];
        }
        
        await client.query('COMMIT');
        return returnedRow;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in setDefaultTermsRepository:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    getAllTermsRepositories,
    createTermsRepositories,
    updateTermsRepositories,
    deleteTermsRepositories,
    setDefaultTermsRepository
};
