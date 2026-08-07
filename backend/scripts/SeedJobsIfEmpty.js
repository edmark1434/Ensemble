/**
 * One-off: seed jobs domain if the jobs table is empty.
 * Usage: node scripts/SeedJobsIfEmpty.js
 */
require('dotenv').config();
const { pool } = require('../lib/Database');
const { seedJobsDomain } = require('../lib/SeedDomains');

async function main() {
  const count = await pool.query('SELECT COUNT(*)::int AS c FROM jobs');
  if (count.rows[0].c > 0) {
    console.log(`Jobs already present (${count.rows[0].c}). Skipping.`);
    await pool.end();
    return;
  }

  const users = await pool.query(`
    SELECT a.account_id, a.display_name, a.handle
    FROM accounts a
    WHERE a.type = 'User' AND a.deleted_at IS NULL
    ORDER BY a.account_id
    LIMIT 8
  `);
  const tags = await pool.query(`SELECT tag_id, name FROM tags ORDER BY tag_id LIMIT 10`);
  const files = await pool.query(`SELECT file_id FROM files ORDER BY file_id LIMIT 5`);

  if (users.rows.length < 4) {
    console.error('Need at least 4 user accounts to seed jobs.');
    await pool.end();
    process.exit(1);
  }

  const result = await seedJobsDomain({
    users: users.rows,
    tags: tags.rows,
    files: files.rows,
  });
  console.log('Seeded jobs domain:', {
    jobs: result?.jobs?.length || 0,
    contracts: result?.contracts?.length || 0,
  });
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
