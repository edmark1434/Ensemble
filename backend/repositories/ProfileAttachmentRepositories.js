const { pool } = require('../lib/Database');

const selectFields = `
  aa.account_attachment_id,
  aa.account_id,
  aa.attachment_kind,
  aa.attachment_type,
  aa.name,
  aa.description,
  aa.external_url,
  aa.is_public,
  aa.display_order,
  aa.metadata,
  aa.created_at,
  aa.updated_at,
  f.file_id,
  f.name AS file_name,
  f.path AS file_path,
  f.mime_type,
  f.size_bytes,
  COALESCE(ptf.path, aa.metadata->>'thumbnail_path') AS project_thumbnail_path,
  COALESCE(pvf.video_path, aa.metadata->>'video_path') AS project_video_path
`;

async function getProfileAttachmentsRepository(accountId, includePrivate = false) {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM account_attachments aa
     LEFT JOIN files f ON f.file_id = aa.file_id AND f.deleted_at IS NULL
     LEFT JOIN projects p
       ON aa.attachment_type = 'project'
      AND (aa.metadata->>'project_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND p.project_id = (aa.metadata->>'project_id')::uuid
      AND p.deleted_at IS NULL
     LEFT JOIN files ptf ON ptf.file_id = p.thumbnail_file_id AND ptf.deleted_at IS NULL
     LEFT JOIN LATERAL (
       SELECT COALESCE(pf.path, of.path) AS video_path
       FROM media_assets ma
       LEFT JOIN files pf ON pf.file_id = ma.proxy_file_id AND pf.deleted_at IS NULL
       LEFT JOIN files of ON of.file_id = ma.original_file_id AND of.deleted_at IS NULL
       WHERE p.project_id IS NOT NULL
         AND ma.project_id = p.project_id
         AND ma.deleted_at IS NULL
         AND (ma.type ILIKE 'video%' OR of.mime_type ILIKE 'video%' OR pf.mime_type ILIKE 'video%')
       ORDER BY ma.created_at DESC
       LIMIT 1
     ) pvf ON true
     WHERE aa.account_id = $1
       AND aa.deleted_at IS NULL
       AND ($2::boolean OR aa.is_public = true)
     ORDER BY aa.display_order, aa.created_at DESC`,
    [accountId, includePrivate]
  );
  return result.rows;
}

async function getOwnedFinalizedFileRepository(accountId, fileId) {
  return (await pool.query(
    `SELECT f.file_id, f.name, f.path, f.mime_type, f.size_bytes
     FROM files f
     JOIN upload_intents ui ON ui.file_id = f.file_id
     WHERE f.file_id = $1 AND ui.account_id = $2
       AND ui.status = 'consumed' AND ui.consumed_at IS NOT NULL
       AND f.deleted_at IS NULL
     LIMIT 1`,
    [fileId, accountId]
  )).rows[0] || null;
}

async function createProfileAttachmentRepository(accountId, attachment) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let fileId = null;
    if (attachment.attachment_kind === 'file') fileId = attachment.file.file_id;

    const result = await client.query(
      `INSERT INTO account_attachments (
         account_id, attachment_kind, attachment_type, name, description,
         file_id, external_url, is_public, display_order, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       RETURNING account_attachment_id`,
      [
        accountId,
        attachment.attachment_kind,
        attachment.attachment_type,
        attachment.name,
        attachment.description,
        fileId,
        attachment.external_url,
        attachment.is_public,
        attachment.display_order,
        JSON.stringify(attachment.metadata || {}),
      ]
    );
    await client.query('COMMIT');
    return result.rows[0].account_attachment_id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteProfileAttachmentRepository(attachmentId, accountId) {
  const result = await pool.query(
    `UPDATE account_attachments
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE account_attachment_id = $1 AND account_id = $2 AND deleted_at IS NULL
     RETURNING account_attachment_id`,
    [attachmentId, accountId]
  );
  return result.rows[0] || null;
}

module.exports = {
  getProfileAttachmentsRepository,
  getOwnedFinalizedFileRepository,
  createProfileAttachmentRepository,
  deleteProfileAttachmentRepository,
};
