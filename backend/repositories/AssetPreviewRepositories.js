const { pool } = require('../lib/Database');

// Read-only lookup used before the create/update transaction opens.
// The transaction re-validates ownership with row locks.
async function findOwnedUploadedFilesRepository(accountId, fileIds) {
  const { rows } = await pool.query(
    `SELECT f.file_id, f.name, f.path, f.mime_type, f.size_bytes
     FROM files f
     JOIN upload_intents ui ON ui.file_id = f.file_id
     WHERE f.file_id = ANY($1::uuid[])
       AND ui.account_id = $2
       AND ui.status = 'consumed' AND ui.consumed_at IS NOT NULL
       AND f.deleted_at IS NULL`,
    [fileIds, accountId]
  );
  return rows;
}

// Image content media assets whose thumbnail/proxy are not yet the generated
// Generated thumbnail + high-quality Full HD Ensemble-watermarked proxy.
async function listAssetDerivativeBackfillCandidatesRepository(limit = 1000) {
  const { rows } = await pool.query(
    `SELECT m.media_asset_id, m.proxy_file_id, m.thumbnail_file_id,
            original.file_id AS original_file_id,
            original.name AS original_name,
            original.path AS original_path,
            original.size_bytes AS original_size_bytes
     FROM media_assets m
     JOIN files original ON original.file_id = m.original_file_id
     LEFT JOIN files proxy ON proxy.file_id = m.proxy_file_id AND proxy.deleted_at IS NULL
     LEFT JOIN files thumbnail ON thumbnail.file_id = m.thumbnail_file_id AND thumbnail.deleted_at IS NULL
     WHERE m.deleted_at IS NULL
       AND m.type = 'image'
       AND EXISTS (
         SELECT 1 FROM market_media_assets link
         WHERE link.media_asset_id = m.media_asset_id
       )
       AND original.deleted_at IS NULL
       AND original.mime_type LIKE 'image/%'
       AND (original.path LIKE 'asset-originals/%' OR original.path LIKE 'assets/%')
       AND NOT COALESCE((
         proxy.path LIKE 'assets/proxies/v2/%'
         AND thumbnail.path LIKE 'assets/thumbnails/%'
       ), FALSE)
     ORDER BY m.created_at, m.media_asset_id
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function replaceMediaAssetDerivativesRepository({
  mediaAssetId,
  expectedProxyFileId,
  expectedThumbnailFileId,
  width,
  height,
  thumbnail,
  proxy,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [current] } = await client.query(
      `SELECT proxy_file_id, thumbnail_file_id
       FROM media_assets
       WHERE media_asset_id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [mediaAssetId]
    );
    if (!current
      || String(current.proxy_file_id) !== String(expectedProxyFileId)
      || String(current.thumbnail_file_id) !== String(expectedThumbnailFileId)) {
      await client.query('ROLLBACK');
      return false;
    }
    const insertFile = async (file) => (await client.query(
      `INSERT INTO files (name, path, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4)
       RETURNING file_id`,
      [file.name, file.path, file.mimeType, file.sizeBytes]
    )).rows[0].file_id;
    const thumbnailFileId = await insertFile(thumbnail);
    const proxyFileId = await insertFile(proxy);
    await client.query(
      `UPDATE media_assets
       SET thumbnail_file_id = $2, proxy_file_id = $3,
           width = COALESCE($4::integer, width), height = COALESCE($5::integer, height)
       WHERE media_asset_id = $1`,
      [mediaAssetId, thumbnailFileId, proxyFileId, width, height]
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  findOwnedUploadedFilesRepository,
  listAssetDerivativeBackfillCandidatesRepository,
  replaceMediaAssetDerivativesRepository,
};
