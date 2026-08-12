const {
  getProfileAttachmentsRepository,
  getOwnedFinalizedFileRepository,
  createProfileAttachmentRepository,
  deleteProfileAttachmentRepository,
} = require('../repositories/ProfileAttachmentRepositories');

class ProfileAttachmentError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function cleanText(value, maxLength, field) {
  const result = String(value || '').trim();
  if (!result || result.length > maxLength) {
    throw new ProfileAttachmentError(`${field} is required and must not exceed ${maxLength} characters`);
  }
  return result;
}

function validateFile(file) {
  if (!file) throw new ProfileAttachmentError('Verified file is required');
  const size = Number(file.size_bytes);
  if (file.mime_type !== 'application/pdf') {
    throw new ProfileAttachmentError('CV or resume must be a PDF file');
  }
  if (!Number.isInteger(size) || size <= 0 || size > 25 * 1024 * 1024) {
    throw new ProfileAttachmentError('PDF size must be between 1 byte and 25 MB');
  }
  const path = String(file.path || '').trim();
  if (!path.startsWith('documents/') || path.includes('..')) {
    throw new ProfileAttachmentError('Invalid profile attachment path');
  }
  return {
    name: cleanText(file.name, 255, 'File name'),
    path,
    mime_type: file.mime_type,
    size_bytes: size,
    file_id: file.file_id,
  };
}

async function getProfileAttachmentsService(accountId, viewerAccountId) {
  return getProfileAttachmentsRepository(
    accountId,
    String(accountId) === String(viewerAccountId)
  );
}

async function createProfileAttachmentService(accountId, payload) {
  const kind = String(payload?.attachment_kind || '').toLowerCase();
  if (!['file', 'link'].includes(kind)) {
    throw new ProfileAttachmentError('Attachment kind must be file or link');
  }
  const type = cleanText(payload?.attachment_type, 50, 'Attachment type').toLowerCase();
  const name = cleanText(payload?.name, 255, 'Attachment name');
  const description = String(payload?.description || '').trim().slice(0, 2000) || null;
  let externalUrl = null;
  let file = null;

  if (kind === 'file') {
    const fileId = String(payload.file_id || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(fileId)) throw new ProfileAttachmentError('Verified file is required');
    file = validateFile(await getOwnedFinalizedFileRepository(accountId, fileId));
  } else {
    try {
      const parsed = new URL(String(payload.external_url || '').trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      externalUrl = parsed.toString();
    } catch {
      throw new ProfileAttachmentError('Enter a valid HTTP or HTTPS website URL');
    }
  }

  const attachmentId = await createProfileAttachmentRepository(accountId, {
    attachment_kind: kind,
    attachment_type: type,
    name,
    description,
    file,
    external_url: externalUrl,
    is_public: payload.is_public !== false,
    display_order: Number.isInteger(payload.display_order) ? payload.display_order : 0,
    metadata: payload.metadata,
  });
  const attachments = await getProfileAttachmentsRepository(accountId, true);
  return attachments.find((item) => String(item.account_attachment_id) === String(attachmentId));
}

async function deleteProfileAttachmentService(attachmentId, accountId) {
  const deleted = await deleteProfileAttachmentRepository(attachmentId, accountId);
  if (!deleted) throw new ProfileAttachmentError('Attachment not found', 404);
  return deleted;
}

module.exports = {
  ProfileAttachmentError,
  getProfileAttachmentsService,
  createProfileAttachmentService,
  deleteProfileAttachmentService,
};
