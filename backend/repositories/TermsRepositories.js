const { pool } = require('../lib/Database');

async function getAllTermsRepositories(accountId) {
    try {
        const query = `
            SELECT terms_id as id, terms_title, terms_description as terms_content, is_default
            FROM terms_of_service
            WHERE account_id IS NULL OR account_id = $1
            ORDER BY is_default DESC, created_at DESC;
        `;
        const res = await pool.query(query, [accountId]);
        return res.rows.map(row => ({
            ...row,
            terms_content: row.terms_content ? row.terms_content.replace(/\\n/g, "\n") : row.terms_content
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
            RETURNING terms_id as id, terms_title, terms_description as terms_content, is_default;
        `;
        const values = [termsData.terms_title, termsData.terms_content, 'jobs', accountId];
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
            SET terms_title = $1, terms_description = $2
            WHERE terms_id = $3 AND account_id = $4
            RETURNING terms_id as id, terms_title, terms_description as terms_content, is_default;
        `;
        const values = [termsData.terms_title, termsData.terms_content, termsId, accountId];
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

module.exports = {
    getAllTermsRepositories,
    createTermsRepositories,
    updateTermsRepositories,
    deleteTermsRepositories
};
