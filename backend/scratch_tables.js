require('dotenv').config();
const { pool } = require('./lib/Database');

async function getTables() {
    try {
        const result = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename;");
        result.rows.forEach(r => {
            console.log(`select * from ${r.tablename};`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
getTables();
