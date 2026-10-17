const {
  listVideoProjects,
  getVideoProject,
  setVideoProjectFreeze,
} = require('../repositories/AdminVideoRepositories');

const STATUSES = new Set(['all', 'active', 'frozen', 'archived']);

async function listAdminVideoProjects({ status, search }) {
  const normalized = String(status || 'all').toLowerCase();
  if (!STATUSES.has(normalized)) {
    const error = new Error('Status filter must be all, active, frozen, or archived');
    error.statusCode = 400;
    throw error;
  }
  return listVideoProjects({ status: normalized, search });
}

async function getAdminVideoProject(projectId) {
  return getVideoProject(projectId);
}

async function freezeAdminVideoProject(projectId, body, session) {
  return setVideoProjectFreeze(projectId, {
    action: body?.action,
    note: body?.note,
  }, session);
}

module.exports = {
  listAdminVideoProjects,
  getAdminVideoProject,
  freezeAdminVideoProject,
};
