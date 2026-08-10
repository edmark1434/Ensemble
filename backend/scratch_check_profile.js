require('dotenv').config();
const { pool } = require('./lib/Database');
const { getProfileServices } = require('./services/AccountServices.js');

async function check() {
    const res = await pool.query("SELECT a.account_id FROM accounts a WHERE a.handle = 'rexzahard7265'");
    const accId = res.rows[0].account_id;
    const profile = await getProfileServices(accId);
    console.log(profile.badges);
    process.exit(0);
}
check().catch(console.error);
