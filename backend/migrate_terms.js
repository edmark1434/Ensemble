const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: parseInt(process.env.DB_PORT || '5432')
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Add account_id
        await client.query(`
            ALTER TABLE terms_of_service 
            ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE
        `);
        console.log("Added account_id column.");

        // 2. Add is_default
        await client.query(`
            ALTER TABLE terms_of_service 
            ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE
        `);
        console.log("Added is_default column.");

        // 3. Update existing ones to be default (assuming they have no account_id)
        await client.query(`
            UPDATE terms_of_service SET is_default = TRUE WHERE account_id IS NULL
        `);
        console.log("Set existing templates to is_default = TRUE.");

        await client.query('COMMIT');
        console.log("Migration successful.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
