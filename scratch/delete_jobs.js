require('dotenv').config({ path: './backend/.env' });
const { pool } = require('./backend/lib/database');

async function deleteBuggyJobs() {
    try {
        console.log("Deleting buggy jobs...");
        const res = await pool.query(`DELETE FROM jobs WHERE title IN ('Edit product launch video', 'Ongoing YouTube editor', 'Social media short pack') RETURNING *`);
        console.log("Deleted:", res.rows.length, "jobs.");
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
deleteBuggyJobs();
