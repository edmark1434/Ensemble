const { pool } = require('../lib/Database');

const MAX_ATTEMPTS = 3;
const STALE_MINUTES = 30;

// Takes the oldest pending job (or one whose worker died). Safe with several workers.
async function claimMediaAssetJobRepository() {
  await pool.query(
    `UPDATE media_asset_jobs
     SET status = 'failed', error = COALESCE(error, 'The worker stopped before finishing'),
         finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE status = 'running' AND attempts >= $1
       AND locked_at < CURRENT_TIMESTAMP - make_interval(mins => $2)`,
    [MAX_ATTEMPTS, STALE_MINUTES]
  );
  const { rows: [job] } = await pool.query(
    `UPDATE media_asset_jobs job
     SET status = 'running', attempts = job.attempts + 1,
         locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE job.media_asset_job_id = (
       SELECT candidate.media_asset_job_id
       FROM media_asset_jobs candidate
       WHERE candidate.attempts < $1
         AND (candidate.status = 'pending'
           OR (candidate.status = 'running'
               AND candidate.locked_at < CURRENT_TIMESTAMP - make_interval(mins => $2)))
       ORDER BY candidate.created_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING job.media_asset_job_id, job.media_asset_id, job.market_asset_id,
               job.kind, job.attempts`,
    [MAX_ATTEMPTS, STALE_MINUTES]
  );
  if (!job) return null;
  const { rows: [media] } = await pool.query(
    `SELECT m.deleted_at, original.file_id AS original_file_id, original.name AS original_name,
            original.path AS original_path, original.mime_type AS original_mime_type,
            original.size_bytes AS original_size_bytes
     FROM media_assets m
     JOIN files original ON original.file_id = m.original_file_id
     WHERE m.media_asset_id = $1`,
    [job.media_asset_id]
  );
  if (!media || media.deleted_at) {
    await failMediaAssetJobRepository(job, 'The media asset was removed', { final: true });
    return null;
  }
  return { ...job, ...media };
}

async function failMediaAssetJobRepository(job, message, { final = false } = {}) {
  const retry = !final && Number(job.attempts) < MAX_ATTEMPTS;
  await pool.query(
    `UPDATE media_asset_jobs
     SET status = $2, error = $3, locked_at = NULL, updated_at = CURRENT_TIMESTAMP,
         finished_at = CASE WHEN $2 = 'failed' THEN CURRENT_TIMESTAMP ELSE NULL END
     WHERE media_asset_job_id = $1`,
    [job.media_asset_job_id, retry ? 'pending' : 'failed', String(message || 'Processing failed').slice(0, 1000)]
  );
  return retry;
}

// Writes the worker's output files onto the media asset and, once every job of the listing is
// done, applies the status the owner asked for. Returns null if the job is no longer ours.
async function completeMediaAssetJobRepository(job, outputs) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [current] } = await client.query(
      `SELECT status FROM media_asset_jobs WHERE media_asset_job_id = $1 FOR UPDATE`,
      [job.media_asset_job_id]
    );
    const { rows: [media] } = await client.query(
      `SELECT original_file_id, deleted_at FROM media_assets WHERE media_asset_id = $1 FOR UPDATE`,
      [job.media_asset_id]
    );
    if (!current || current.status !== 'running' || !media || media.deleted_at) {
      await client.query('ROLLBACK');
      return null;
    }
    const insertFile = async (file) => (await client.query(
      `INSERT INTO files (name, path, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4)
       RETURNING file_id`,
      [file.name, file.path, file.mimeType, file.sizeBytes]
    )).rows[0].file_id;

    const proxyFileId = await insertFile(outputs.proxy);
    const thumbnailFileId = outputs.thumbnail ? await insertFile(outputs.thumbnail) : null;
    const originalFileId = outputs.cappedOriginal ? await insertFile(outputs.cappedOriginal) : null;
    await client.query(
      `UPDATE media_assets
       SET proxy_file_id = $2,
           thumbnail_file_id = COALESCE($3::uuid, thumbnail_file_id),
           original_file_id = COALESCE($4::uuid, original_file_id),
           width = COALESCE($5::integer, width),
           height = COALESCE($6::integer, height),
           duration_seconds = COALESCE($7::integer, duration_seconds)
       WHERE media_asset_id = $1`,
      [job.media_asset_id, proxyFileId, thumbnailFileId, originalFileId,
        outputs.width ?? null, outputs.height ?? null, outputs.durationSeconds ?? null]
    );
    let replacedOriginalPath = null;
    if (originalFileId) {
      const { rows: [old] } = await client.query(
        `UPDATE files SET deleted_at = CURRENT_TIMESTAMP
         WHERE file_id = $1 RETURNING path`,
        [media.original_file_id]
      );
      replacedOriginalPath = old?.path || null;
    }
    await client.query(
      `UPDATE media_asset_jobs
       SET status = 'done', error = NULL, locked_at = NULL,
           finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE media_asset_job_id = $1`,
      [job.media_asset_job_id]
    );
    const { rows: [state] } = await client.query(
      `SELECT bool_and(job.status = 'done') AS all_done,
              (array_agg(job.publish_status) FILTER (WHERE job.publish_status IS NOT NULL))[1] AS publish_status
       FROM media_asset_jobs job
       JOIN market_media_assets link ON link.media_asset_id = job.media_asset_id
         AND link.market_asset_id = job.market_asset_id
       JOIN media_assets media ON media.media_asset_id = link.media_asset_id AND media.deleted_at IS NULL
       WHERE job.market_asset_id = $1`,
      [job.market_asset_id]
    );
    if (state.all_done && state.publish_status) {
      await client.query(
        `UPDATE market_assets
         SET status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE market_asset_id = $1 AND deleted_at IS NULL AND status = 'draft'`,
        [job.market_asset_id, state.publish_status]
      );
    }
    await client.query('COMMIT');
    return { replacedOriginalPath };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  claimMediaAssetJobRepository,
  failMediaAssetJobRepository,
  completeMediaAssetJobRepository,
};
