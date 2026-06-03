const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbName = process.env.DB_NAME;

if (!dbName || !/^[a-zA-Z0-9_]+$/.test(dbName)) {
  console.error('❌ DB_NAME must be set in .env and contain only letters, numbers, and underscores.');
  process.exit(1);
}

async function setup() {
  const admin = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await admin.connect();
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);

    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Created database "${dbName}"`);
    } else {
      console.log(`ℹ️ Database "${dbName}" already exists`);
    }
  } finally {
    await admin.end();
  }

  const pool = require('./database');
  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await pool.query(schemaSql);
  console.log('✅ Applied schema (accounts, users, staff)');
  await pool.end();
}

setup()
  .then(() => {
    console.log('✨ Database setup complete. Run: npm run seed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Database setup failed:', err.message);
    process.exit(1);
  });
