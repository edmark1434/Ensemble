const {
  getModerationOverview,
  updatePendingCase,
  deletePendingCase,
  assignMyselfToPendingCase,
} = require('../Repositories/AdminModerationRepositories');

async function getAdminModerationOverview(req, res) {
  try {
    const data = await getModerationOverview(req.session);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching moderation overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load moderation data' });
  }
}

async function patchAdminModerationCase(req, res) {
  try {
    const data = await updatePendingCase(req.params.id, req.body || {}, req.session);
    res.status(200).json({ success: true, data, message: 'Case updated' });
  } catch (err) {
    console.error('Error updating moderation case:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update case' });
  }
}

async function deleteAdminModerationCase(req, res) {
  try {
    const data = await deletePendingCase(req.params.id, req.body || {}, req.session);
    res.status(200).json({ success: true, data, message: 'Case deleted' });
  } catch (err) {
    console.error('Error deleting moderation case:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to delete case' });
  }
}

async function postAdminModerationCaseAssignMyself(req, res) {
  try {
    const data = await assignMyselfToPendingCase(req.params.id, req.body || {}, req.session);
    res.status(200).json({ success: true, data, message: 'Case assigned to you' });
  } catch (err) {
    console.error('Error assigning moderation case:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to assign case' });
  }
}

module.exports = {
  getAdminModerationOverview,
  patchAdminModerationCase,
  deleteAdminModerationCase,
  postAdminModerationCaseAssignMyself,
};
