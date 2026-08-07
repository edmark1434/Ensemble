const pool = require('./lib/database').pool;
const repo = require('./Repositories/DashboardRepositories');

async function run() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'milestone_submits';");
        console.log("Columns:", res.rows);
    } catch(e) {
        console.error("Stack trace:", e);
    } finally {
        pool.end();
    }
}

run();
