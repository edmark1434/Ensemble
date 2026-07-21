require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PG_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.PG_PORT || process.env.DB_PORT || 5432),
  user: process.env.PG_USER || process.env.DB_USER || 'postgres',
  password: process.env.PG_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.PG_DATABASE || process.env.DB_NAME || 'postgres',
});

const tables = process.argv.slice(2);

(async () => {
  if (tables.length === 0) {
    const r = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log(r.rows.map((x) => x.table_name).join('\n'));
  } else {
    for (const t of tables) {
      const r = await pool.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
        [t]
      );
      console.log(`\n=== ${t} ===`);
      r.rows.forEach((c) =>
        console.log(`${c.column_name} | ${c.data_type} | null:${c.is_nullable} | ${c.column_default || ''}`)
      );
    }
  }
  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
