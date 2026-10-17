const {
  listVideoProjects,
  getVideoProject,
  setVideoProjectFreeze,
  setVideoProjectRemoval,
} = require('../repositories/AdminVideoRepositories');

const STATUSES = new Set(['all', 'active', 'frozen', 'archived', 'removed']);

async function listAdminVideoProjects({ status, search }) {
  const normalized = String(status || 'all').toLowerCase();
  if (!STATUSES.has(normalized)) {
    const error = new Error('Status filter must be all, active, frozen, archived, or removed');
    error.statusCode = 400;
    throw error;
  }
  return listVideoProjects({ status: normalized, search });
}

async function getAdminVideoProject(projectId) {
  return getVideoProject(projectId);
}

async function freezeAdminVideoProject(projectId, body, session) {
  const action = String(body?.action || '').toLowerCase();
  if (action === 'remove' || action === 'restore') {
    return setVideoProjectRemoval(projectId, action, session);
  }
  return setVideoProjectFreeze(projectId, {
    action,
    note: body?.note,
  }, session);
}

module.exports = {
  listAdminVideoProjects,
  getAdminVideoProject,
  freezeAdminVideoProject,
};
