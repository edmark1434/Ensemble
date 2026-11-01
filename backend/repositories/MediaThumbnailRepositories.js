const { pool } = require('../lib/Database');

async function listMediaThumbnailCandidatesRepository(limit, type = null) {
  const { rows } = await pool.query(
    `SELECT m.media_asset_id, m.type, m.original_file_id, m.thumbnail_file_id,
            original.path AS original_path, original.name AS original_name, original.size_bytes AS original_size_bytes,
            EXISTS (SELECT 1 FROM market_media_assets link WHERE link.media_asset_id = m.media_asset_id) AS is_content
     FROM media_assets m
     JOIN files original ON original.file_id = m.original_file_id AND original.deleted_at IS NULL
     LEFT JOIN files thumbnail ON thumbnail.file_id = m.thumbnail_file_id AND thumbnail.deleted_at IS NULL
     WHERE m.deleted_at IS NULL
       AND ($2::text IS NULL OR m.type::text = $2)
       AND (EXISTS (SELECT 1 FROM market_media_assets link WHERE link.media_asset_id = m.media_asset_id)
         OR EXISTS (SELECT 1 FROM market_asset_thumbnails link WHERE link.media_asset_id = m.media_asset_id))
       AND original.mime_type LIKE m.type || '/%'
       AND (original.path LIKE 'asset-originals/%' OR original.path LIKE 'assets/%')
       AND NOT EXISTS (SELECT 1 FROM media_asset_jobs job WHERE job.media_asset_id = m.media_asset_id
                       AND job.status IN ('pending', 'running'))
       AND NOT COALESCE(CASE WHEN m.type = 'image'
         AND NOT EXISTS (SELECT 1 FROM market_media_assets link WHERE link.media_asset_id = m.media_asset_id)
         THEN m.thumbnail_file_id = m.original_file_id AND m.width > 0 AND m.height > 0
         WHEN m.type = 'audio'
         THEN thumbnail.path LIKE 'assets/thumbnails/audio-30s/%' AND thumbnail.mime_type = 'audio/mpeg'
         WHEN m.type = 'video' THEN thumbnail.path LIKE 'assets/thumbnails/video-5s-480/%' AND thumbnail.mime_type = 'video/mp4'
         ELSE thumbnail.path LIKE 'assets/thumbnails/640/%' AND thumbnail.mime_type = 'image/webp' END, FALSE)
     ORDER BY m.created_at, m.media_asset_id LIMIT $1`, [limit, type]
  );
  return rows;
}

async function replaceMediaThumbnailRepository(candidate, thumbnail, metadata = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [current] } = await client.query(
      `SELECT original_file_id, thumbnail_file_id,
              EXISTS (SELECT 1 FROM market_media_assets link WHERE link.media_asset_id = media_assets.media_asset_id) AS is_content
       FROM media_assets
       WHERE media_asset_id = $1 AND deleted_at IS NULL FOR UPDATE`, [candidate.media_asset_id]
    );
    if (!current || current.original_file_id !== candidate.original_file_id
      || current.thumbnail_file_id !== candidate.thumbnail_file_id
      || (metadata.useOriginalThumbnail && current.is_content)) {
      await client.query('ROLLBACK');
      return false;
    }
    const file = metadata.useOriginalThumbnail ? { file_id: current.original_file_id } : (await client.query(
      `INSERT INTO files (name, path, mime_type, size_bytes) VALUES ($1, $2, $3, $4) RETURNING file_id`,
      [thumbnail.name, thumbnail.path, thumbnail.mimeType, thumbnail.sizeBytes]
    )).rows[0];
    await client.query(`UPDATE media_assets SET thumbnail_file_id = $2,
        width = COALESCE($3::integer, width), height = COALESCE($4::integer, height)
      WHERE media_asset_id = $1`,
      [candidate.media_asset_id, file.file_id, metadata.width ?? null, metadata.height ?? null]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { listMediaThumbnailCandidatesRepository, replaceMediaThumbnailRepository };
