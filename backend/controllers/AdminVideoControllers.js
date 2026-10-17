const {
  listAdminVideoProjects,
  getAdminVideoProject,
  freezeAdminVideoProject,
} = require('../services/AdminVideoServices');

function sendError(res, err, fallback) {
  const status = err?.statusCode || 500;
  const message = status < 500 ? err.message : fallback;
  if (status >= 500) console.error(fallback, err);
  res.status(status).json({ success: false, message });
}

async function getAdminVideos(req, res) {
  try {
    const data = await listAdminVideoProjects({
      status: req.query.status,
      search: req.query.search,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load video projects');
  }
}

async function getAdminVideo(req, res) {
  try {
    const data = await getAdminVideoProject(req.params.projectId);
    if (!data) return res.status(404).json({ success: false, message: 'Project not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load video project');
  }
}

async function patchAdminVideo(req, res) {
  try {
    const data = await freezeAdminVideoProject(req.params.projectId, req.body || {}, req.session);
    const action = String(req.body?.action || '').toLowerCase();
    const message = {
      freeze: 'Project frozen',
      unfreeze: 'Project unfrozen',
      remove: 'Project removed from the library',
      restore: 'Project restored',
    }[action] || 'Project updated';
    res.status(200).json({ success: true, data, message });
  } catch (err) {
    sendError(res, err, 'Failed to update video project');
  }
}

module.exports = {
  getAdminVideos,
  getAdminVideo,
  patchAdminVideo,
};
