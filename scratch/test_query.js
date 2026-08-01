require('dotenv').config({ path: './backend/.env' });
const { pool } = require('./backend/lib/database');

async function testQuery() {
    try {
        const accountId = '2a8e488d-56ef-466d-a764-a6fcda8537b9'; // Example UUID
        let query = `
            SELECT 
                j.job_id,
                CASE WHEN $1::uuid IS NOT NULL THEN (SELECT EXISTS(SELECT 1 FROM job_saves js WHERE js.job_id = j.job_id AND js.account_id = $1)) ELSE FALSE END as is_saved
            FROM jobs j
            WHERE j.deleted_at IS NULL
            LIMIT 1
        `;
        const res = await pool.query(query, [null]);
        console.log("With null account:", res.rows);
        
        const res2 = await pool.query(query, [accountId]);
        console.log("With accountId:", res2.rows);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
testQuery();
