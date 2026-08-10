const pg = require("pg");
const dotenv = require("dotenv");

dotenv.config();
const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "your_password",
  database:  "postgres", // Connect to the default database
});

async function createDatabase() {
  await client.connect();

  const dbName = process.env.DB_NAME;

  const result = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [dbName]
  );

  if (result.rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database "${dbName}" created.`);
  } else {
    console.log(`Database "${dbName}" already exists.`);
  }

  await client.end();
}

createDatabase().catch(console.error);