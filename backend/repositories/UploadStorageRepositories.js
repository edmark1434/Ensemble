const { pool } = require('../lib/Database');

async function listExpiredUploadsRepository() {
  const { rows } = await pool.query(`SELECT media_asset_id FROM media_assets
    WHERE deleted_at IS NULL AND trashed_at <= CURRENT_TIMESTAMP - INTERVAL '30 days'
      AND is_marketed = FALSE
    ORDER BY trashed_at LIMIT 100`);
  return rows;
}

async function deleteExpiredUploadRepository(id, removeObjects) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [upload] } = await client.query(`SELECT * FROM media_assets
      WHERE media_asset_id = $1 AND deleted_at IS NULL AND is_marketed = FALSE
        AND trashed_at <= CURRENT_TIMESTAMP - INTERVAL '30 days'
      FOR UPDATE SKIP LOCKED`, [id]);
    if (!upload) { await client.query('COMMIT'); return false; }
    const { rows: files } = await client.query(`SELECT DISTINCT path FROM files
      WHERE file_id = ANY($1::uuid[])`, [[upload.original_file_id, upload.proxy_file_id, upload.thumbnail_file_id]]);
    const { rows: shared } = await client.query(`SELECT DISTINCT f.path
      FROM media_assets m JOIN files f
        ON f.file_id IN (m.original_file_id, m.proxy_file_id, m.thumbnail_file_id)
      WHERE m.media_asset_id <> $1 AND m.deleted_at IS NULL AND f.path = ANY($2::text[])`,
      [id, files.map(file => file.path)]);
    const retained = new Set(shared.map(file => file.path));
    const keys = files.map(file => file.path).filter(key => !retained.has(key));
    await removeObjects(upload.owner_user_id, keys);
    await client.query('UPDATE media_assets SET deleted_at = CURRENT_TIMESTAMP WHERE media_asset_id = $1', [id]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

module.exports = { listExpiredUploadsRepository, deleteExpiredUploadRepository };
