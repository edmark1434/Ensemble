const pool = require('./lib/database').pool;

async function debug() {
    try {
        console.log("Checking contract_milestones...");
        const result = await pool.query('SELECT * FROM contract_milestones');
        console.log("Contract Milestones:", result.rows.length);
        
        console.log("Checking contracts...");
        const cRes = await pool.query('SELECT contract_id, status FROM contracts');
        console.log("Contracts:", cRes.rows.length);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
debug();
