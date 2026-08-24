const { pool } = require('../lib/Database');

const LOW_QUALITY_PREVIEW_PATTERN = '%-low-quality-preview.webp';

async function listAssetPreviewBackfillCandidatesRepository(limit = 1000) {
  const { rows } = await pool.query(
    `SELECT bundle.media_asset_bundle_file_id,
            bundle.media_asset_id,
            bundle.position,
            bundle.preview_file_id,
            original.name AS original_name,
            original.path AS original_path,
            original.mime_type AS original_mime_type,
            original.size_bytes AS original_size_bytes
     FROM media_asset_bundle_files bundle
     JOIN media_assets media ON media.media_asset_id = bundle.media_asset_id
     JOIN files original ON original.file_id = bundle.file_id
     JOIN files preview ON preview.file_id = bundle.preview_file_id
     WHERE bundle.deleted_at IS NULL
       AND media.deleted_at IS NULL
       AND original.deleted_at IS NULL
       AND preview.deleted_at IS NULL
       AND original.mime_type LIKE 'image/%'
       AND (original.path LIKE 'asset-originals/%' OR original.path LIKE 'assets/%')
       AND NOT (
         preview.mime_type = 'image/webp'
         AND LOWER(preview.name) LIKE $1
       )
     ORDER BY bundle.media_asset_id, bundle.position,
              bundle.media_asset_bundle_file_id
     LIMIT $2`,
    [LOW_QUALITY_PREVIEW_PATTERN, limit]
  );
  return rows;
}

async function replaceAssetBundlePreviewRepository({
  bundleFileId,
  expectedPreviewFileId,
  previewName,
  previewPath,
  previewSizeBytes,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [bundle] } = await client.query(
      `SELECT media_asset_id, position, preview_file_id
       FROM media_asset_bundle_files
       WHERE media_asset_bundle_file_id = $1
         AND deleted_at IS NULL
       FOR UPDATE`,
      [bundleFileId]
    );
    if (!bundle || String(bundle.preview_file_id) !== String(expectedPreviewFileId)) {
      await client.query('ROLLBACK');
      return null;
    }

    const { rows: [preview] } = await client.query(
      `INSERT INTO files (name, path, mime_type, size_bytes)
       VALUES ($1, $2, 'image/webp', $3)
       RETURNING file_id`,
      [previewName, previewPath, previewSizeBytes]
    );
    const updated = await client.query(
      `UPDATE media_asset_bundle_files
       SET preview_file_id = $2
       WHERE media_asset_bundle_file_id = $1
         AND preview_file_id = $3
         AND deleted_at IS NULL`,
      [bundleFileId, preview.file_id, expectedPreviewFileId]
    );
    if (updated.rowCount !== 1) {
      await client.query('ROLLBACK');
      return null;
    }

    if (Number(bundle.position) === 0) {
      await client.query(
        `UPDATE media_assets
         SET proxy_file_id = $2
         WHERE media_asset_id = $1 AND deleted_at IS NULL`,
        [bundle.media_asset_id, preview.file_id]
      );
    }
    await client.query('COMMIT');
    return { previewFileId: preview.file_id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listAssetPreviewBackfillCandidatesRepository,
  replaceAssetBundlePreviewRepository,
};
