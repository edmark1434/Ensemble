const {
  getModerationOverview,
  updatePendingCase,
  deletePendingCase,
  assignMyselfToPendingCase,
  reverseModerationActivity,
  fetchModerationActivityPage,
  fetchModerationActivityDetail,
} = require('../repositories/AdminModerationRepositories');

/** Keeps a blank or `all` query string out of the repository filters. */
function optionalFilter(value) {
  const text = String(value ?? '').trim();
  return text && text.toLowerCase() !== 'all' ? text : 'all';
}

function optionalDate(value) {
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text : null;
}

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

async function getAdminModerationActivity(req, res) {
  try {
    const data = await fetchModerationActivityPage({
      search: String(req.query.search || '').trim(),
      category: optionalFilter(req.query.category),
      eventCode: optionalFilter(req.query.eventCode),
      role: optionalFilter(req.query.role),
      state: optionalFilter(req.query.state),
      accountId: String(req.query.accountId || '').trim() || null,
      from: optionalDate(req.query.from),
      to: optionalDate(req.query.to),
      sort: String(req.query.sort || 'newest'),
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching moderation activity log:', err);
    res.status(500).json({ success: false, message: 'Failed to load the activity log' });
  }
}

async function getAdminModerationActivityDetail(req, res) {
  try {
    const data = await fetchModerationActivityDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching moderation activity entry:', err);
    res.status(500).json({ success: false, message: 'Failed to load this activity entry' });
  }
}

async function postAdminModerationActivityReverse(req, res) {
  try {
    const data = await reverseModerationActivity(req.params.id, req.session);
    res.status(200).json({ success: true, data, message: 'Action reversed' });
  } catch (err) {
    const msg = err.message || 'Failed to reverse action';
    const code = err.statusCode === 404 ? 404 : 400;
    res.status(code).json({ success: false, message: msg });
  }
}

module.exports = {
  getAdminModerationOverview,
  patchAdminModerationCase,
  deleteAdminModerationCase,
  postAdminModerationCaseAssignMyself,
  getAdminModerationActivity,
  getAdminModerationActivityDetail,
  postAdminModerationActivityReverse,
};
