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
  f.size_bytes
`;

async function getProfileAttachmentsRepository(accountId, includePrivate = false) {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM account_attachments aa
     LEFT JOIN files f ON f.file_id = aa.file_id AND f.deleted_at IS NULL
     WHERE aa.account_id = $1
       AND aa.deleted_at IS NULL
       AND ($2::boolean OR aa.is_public = true)
     ORDER BY aa.display_order, aa.created_at DESC`,
    [accountId, includePrivate]
  );
  return result.rows;
}

async function createProfileAttachmentRepository(accountId, attachment) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let fileId = null;
    if (attachment.attachment_kind === 'file') {
      const fileResult = await client.query(
        `INSERT INTO files (name, path, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4)
         RETURNING file_id`,
        [attachment.file.name, attachment.file.path, attachment.file.mime_type, attachment.file.size_bytes]
      );
      fileId = fileResult.rows[0].file_id;
    }

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
  createProfileAttachmentRepository,
  deleteProfileAttachmentRepository,
};
