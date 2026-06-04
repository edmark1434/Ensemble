const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Create a shared PostgreSQL connection pool using environment variables.
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port:  process.env.DB_PORT,
});
let isConnected = false;
async function connectPostgresDB() {
    if (isConnected) return pool;
    try {
        await pool.connect();
        console.log('Connected successfully to PostgreSQL');
        isConnected = true;
        return pool;
    }catch (err) {
        console.error('PostgreSQL connection error:', err);
        process.exit(1); // Stop the app if we can't connect to our database
    }
}


module.exports = {  pool, connectPostgresDB };