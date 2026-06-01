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

pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('PostgreSQL pool error', err.stack);
});

module.exports = pool;