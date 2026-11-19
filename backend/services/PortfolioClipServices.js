const { getProjectForPortfolioByAccount } = require('../repositories/ProjectRepositories');
const { enqueueClip, clipStatus, cancelClip } = require('../repositories/PortfolioClipRepositories');
const { ProfileAttachmentError } = require('./ProfileAttachmentServices');

async function portfolioProject(accountId, projectId) {
  const project = await getProjectForPortfolioByAccount(accountId, projectId);
  if (!project || !project.portfolioUseAllowed) throw new ProfileAttachmentError('Portfolio use is unavailable for this project.', 403);
  return project;
}

function validateRange(project, startMs, endMs) {
  if (!Number.isSafeInteger(startMs) || !Number.isSafeInteger(endMs) || startMs < 0 || endMs <= startMs ||
      (project.portfolioUseDurationSeconds != null && endMs - startMs > project.portfolioUseDurationSeconds * 1000)) {
    throw new ProfileAttachmentError('The selected range exceeds the permitted clip duration.');
  }
}

async function editorClipAction(accountId, projectId, input) {
  if (input.action === 'status') {
    const job = await clipStatus(accountId, projectId, input.renderId);
    if (!job) throw new ProfileAttachmentError('Clip export not found.', 404);
    return job;
  }
  if (input.action === 'cancel') {
    if (typeof input.renderId !== 'string' || !input.renderId) {
      throw new ProfileAttachmentError('Clip export not found.', 404);
    }
    await cancelClip(accountId, projectId, input.renderId);
    return { status: 'cancelled' };
  }
  const project = await portfolioProject(accountId, projectId);
  if (input.action === 'terms') return { name: project.name, maxSeconds: project.portfolioUseDurationSeconds,
    width: project.width, height: project.height };
  if (input.action !== 'enqueue' || typeof input.renderId !== 'string' || !input.renderId ||
      typeof input.name !== 'string' || !input.name.trim() || input.name.length > 255 ||
      typeof input.description !== 'string' || input.description.length > 2000) {
    throw new ProfileAttachmentError('Invalid portfolio export.');
  }
  validateRange(project, input.startMs, input.endMs);
  await enqueueClip(accountId, projectId, input);
  return { status: 'pending' };
}
module.exports = { portfolioProject, validateRange, editorClipAction };
