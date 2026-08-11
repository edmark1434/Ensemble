require('dotenv').config();
const { pool } = require('./lib/Database');

async function checkNames() {
    try {
        const res = await pool.query("SELECT u.first_name, u.middle_name, u.last_name, a.display_name FROM accounts a JOIN users u ON u.account_id = a.account_id WHERE u.middle_name IS NOT NULL LIMIT 5;");
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
checkNames();
