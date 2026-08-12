const { pool } = require('./lib/Database');

async function checkFilesSchema() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'files';
        `);
        console.log(result.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkFilesSchema();
