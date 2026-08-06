const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'terms_of_service'");
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
