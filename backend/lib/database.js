const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

//create a new PostgreSQL client using connection parameters from environment variables
const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port:  process.env.DB_PORT,
});
//connect to the database and log success or error
client.connect()
    .then(() => console.log('Connected to PostgreSQL database'))
    .catch(err => console.error('Connection error', err.stack));

module.exports = client;