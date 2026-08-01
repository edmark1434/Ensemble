require('dotenv').config({ path: './.env' });
const { pool } = require('./lib/database');

async function deleteBuggyJobs() {
    try {
        console.log("Deleting buggy jobs...");
        const res = await pool.query(`UPDATE jobs SET deleted_at = NOW() WHERE title IN ('Edit product launch video', 'Ongoing YouTube editor', 'Social media short pack') RETURNING *`);
        console.log("Deleted:", res.rows.length, "jobs.");
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
deleteBuggyJobs();
