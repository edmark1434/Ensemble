const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  try {
    const query = `
            SELECT 
                p.*,
                j.title as job_title,
                j.category as job_category,
                c.display_name as client_name,
                c.handle as client_handle,
                (SELECT f.path FROM files f WHERE f.file_id = c.avatar_file_id LIMIT 1) as client_avatar_path,
                t.terms_title, t.terms_type,
                (SELECT json_agg(json_build_object('id', m.proposal_milestone_id, 'name', m.name, 'description', m.description, 'hours', m.duration_hrs, 'revisions', m.no_of_revisions_max)) FROM proposal_milestones m WHERE m.proposal_id = p.proposal_id) as milestones
            FROM proposals p
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN accounts c ON j.client_account_id = c.account_id
            LEFT JOIN terms_of_service t ON p.terms_id = t.terms_id
            WHERE p.deleted_at IS NULL
    `;
    const res = await pool.query(query);
    console.log('Result length:', res.rows.length);
    if (res.rows.length > 0) {
      console.log('First row keys:', Object.keys(res.rows[0]));
      console.log('First row proposal_id:', res.rows[0].proposal_id);
      console.log('First row id:', res.rows[0].id);
    }
  } catch (e) {
    console.error('SQL Error:', e);
  } finally {
    pool.end();
  }
}

test();
