const { pool } = require('../lib/Database');

async function enqueueClip(accountId, projectId, clip) {
  await pool.query(`INSERT INTO portfolio_clip_exports
    (render_id, account_id, project_id, start_ms, end_ms, name, description)
    VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (render_id) DO NOTHING`,
  [clip.renderId, accountId, projectId, clip.startMs, clip.endMs, clip.name, clip.description]);
}

async function clipStatus(accountId, projectId, renderId) {
  return (await pool.query(`SELECT status, error FROM portfolio_clip_exports
    WHERE account_id=$1 AND project_id=$2 AND render_id=$3`, [accountId, projectId, renderId])).rows[0];
}

async function cancelClip(accountId, projectId, renderId) {
  await pool.query(`DELETE FROM portfolio_clip_exports
    WHERE account_id=$1 AND project_id=$2 AND render_id=$3 AND status='pending'`,
  [accountId, projectId, renderId]);
}

// A transaction lock gives a restarted worker the job back automatically.
async function withDueClip(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const job = (await client.query(`SELECT j.*, u.user_id FROM portfolio_clip_exports j
      JOIN users u ON u.account_id=j.account_id
      WHERE NOT j.released AND j.next_check_at <= now()
      ORDER BY j.next_check_at LIMIT 1 FOR UPDATE OF j SKIP LOCKED`)).rows[0];
    if (job) {
      const result = await work(job);
      if (result.file) {
        const file = result.file;
        const { rows } = await client.query(`INSERT INTO files (name,path,mime_type,size_bytes)
          VALUES ($1,$2,'video/mp4',$3) RETURNING file_id`, [job.name.slice(0, 251) + '.mp4', file.key, file.size]);
        await client.query(`INSERT INTO account_attachments
          (account_attachment_id,account_id,attachment_kind,attachment_type,name,description,file_id,metadata)
          VALUES ($1,$2,'file','project',$3,$4,$5,$6)`,
        [job.attachment_id, job.account_id, job.name, job.description, rows[0].file_id, result.metadata]);
      }
      const failures = result.retry ? job.failures + 1 : 0;
      const delay = result.file || result.error ? 0 : result.retry ? Math.min(120, 5 * 2 ** failures) : 5;
      await client.query(`UPDATE portfolio_clip_exports SET status=$2, error=$3, failures=$4, released=$6,
        next_check_at=clock_timestamp()+ $5 * interval '1 second' WHERE render_id=$1`,
      [job.render_id, result.file ? 'published' : result.error ? 'failed' : job.status, result.error || job.error,
        failures, delay, !!result.released]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}
module.exports = { enqueueClip, clipStatus, cancelClip, withDueClip };
