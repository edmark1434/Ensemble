const {
  getProfileAttachmentsRepository,
  getOwnedFinalizedFileRepository,
  createProfileAttachmentRepository,
  deleteProfileAttachmentRepository,
} = require('../repositories/ProfileAttachmentRepositories');
const { getProjectForPortfolioByAccount } = require('../repositories/ProjectRepositories');

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
  let metadata = payload?.metadata && typeof payload.metadata === 'object' ? { ...payload.metadata } : {};

  if (kind === 'file') {
    const fileId = String(payload.file_id || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(fileId)) throw new ProfileAttachmentError('Verified file is required');
    file = validateFile(await getOwnedFinalizedFileRepository(accountId, fileId));
  } else if (type === 'project') {
    const projectId = String(payload.project_id || metadata.project_id || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
      throw new ProfileAttachmentError('Valid project is required');
    }

    const project = await getProjectForPortfolioByAccount(accountId, projectId);
    if (!project) {
      throw new ProfileAttachmentError('Project not found or you do not have access to it', 403);
    }

    if (!project.portfolioUseAllowed) {
      throw new ProfileAttachmentError('Client did not permit portfolio use for this project', 403);
    }

    const projectDuration = Math.max(1, Number(project.duration_seconds) || 60);
    const maxAllowedSeconds = project.portfolioUseDurationSeconds
      ? Math.min(Number(project.portfolioUseDurationSeconds), projectDuration)
      : projectDuration;

    const clipStart = Math.max(0, Number(payload.clip_start_seconds ?? metadata.clip_start_seconds ?? 0));
    const clipEnd = Number(
      payload.clip_end_seconds ?? metadata.clip_end_seconds ?? Math.min(clipStart + maxAllowedSeconds, projectDuration)
    );

    if (!Number.isFinite(clipStart) || !Number.isFinite(clipEnd) || clipEnd <= clipStart) {
      throw new ProfileAttachmentError('End timestamp must be greater than start timestamp');
    }
    if (clipEnd > projectDuration + 0.5) {
      throw new ProfileAttachmentError(`Selected timestamp exceeds project duration (${projectDuration}s)`);
    }
    if (project.portfolioUseDurationSeconds && (clipEnd - clipStart) > Number(project.portfolioUseDurationSeconds) + 0.5) {
      throw new ProfileAttachmentError(
        `Selected clip duration (${Math.round(clipEnd - clipStart)}s) exceeds the client's allowed limit of ${project.portfolioUseDurationSeconds}s`
      );
    }

    externalUrl = `https://ensemble.local/projects/${project.id}`;
    metadata = {
      ...metadata,
      project_id: project.id,
      project_name: project.name,
      role: project.role,
      shared_by: project.clientName || project.sharedBy || null,
      contract_title: project.contractTitle || null,
      is_shared_project: Boolean(project.isSharedProject),
      portfolio_use_allowed: true,
      max_allowed_seconds: project.portfolioUseDurationSeconds ? Number(project.portfolioUseDurationSeconds) : null,
      project_duration_seconds: projectDuration,
      clip_start_seconds: Math.round(clipStart * 10) / 10,
      clip_end_seconds: Math.round(clipEnd * 10) / 10,
      thumbnail_path: project.thumbnailPath || null,
      video_path: project.videoPath || null,
      width: project.width || null,
      height: project.height || null,
    };
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
    metadata,
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
