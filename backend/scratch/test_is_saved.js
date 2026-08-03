require('dotenv').config();
const { pool } = require('../lib/database');

async function testQuery() {
    try {
        let query = `
            SELECT 
                j.job_id,
                (SELECT COUNT(*) FROM job_saves js WHERE js.job_id = j.job_id) as saves_count,
                CASE WHEN $1::uuid IS NOT NULL THEN (SELECT EXISTS(SELECT 1 FROM job_saves js WHERE js.job_id = j.job_id AND js.account_id = $1)) ELSE FALSE END as is_saved
            FROM jobs j
            WHERE j.deleted_at IS NULL AND j.job_id = $2
            LIMIT 1
        `;
        // Fetch any existing save
        const savedCheck = await pool.query('SELECT * FROM job_saves LIMIT 1');
        if (savedCheck.rows.length === 0) {
            console.log("No saves in database");
            return;
        }
        const { job_id, account_id } = savedCheck.rows[0];
        console.log(`Found save: job=${job_id}, account=${account_id}`);
        
        const res = await pool.query(query, [account_id, job_id]);
        console.log("With accountId:", res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
testQuery();
