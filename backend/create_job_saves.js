require('dotenv').config({ path: './.env' });
const { pool } = require('./lib/database');

async function createJobSaves() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS job_saves (
                job_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE,
                account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (job_id, account_id)
            );
        `);
        console.log("Table job_saves created successfully.");
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
createJobSaves();
