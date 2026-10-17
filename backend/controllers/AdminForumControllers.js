const forum = require('../services/AdminForumServices');

function sendError(res, err, fallback) {
  const status = err?.statusCode || (String(err?.message || '').includes('MongoDB') ? 503 : 500);
  const message = status < 500 || String(err?.message || '').includes('MongoDB') ? err.message : fallback;
  if (status >= 500 && !String(err?.message || '').includes('MongoDB')) console.error(fallback, err);
  res.status(status).json({ success: false, message });
}

async function getAdminForumGroups(req, res) {
  try {
    const data = await forum.listAdminForumGroups();
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load forum groups');
  }
}

async function getAdminForumGroup(req, res) {
  try {
    const data = await forum.getAdminForumGroup(req.params.groupId);
    if (!data) return res.status(404).json({ success: false, message: 'Group not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load forum group');
  }
}

async function patchAdminForumGroup(req, res) {
  try {
    const data = await forum.updateAdminForumGroup(req.params.groupId, req.body || {});
    res.status(200).json({
      success: true,
      data,
      message: data?.status === 'active' ? 'Group is active again' : 'Group archived',
    });
  } catch (err) {
    sendError(res, err, 'Failed to update forum group');
  }
}

async function patchAdminForumMember(req, res) {
  try {
    const data = await forum.updateAdminForumMember(req.params.groupId, req.params.memberId, req.body || {});
    res.status(200).json({
      success: true,
      data,
      message: req.body?.isBanned ? 'Member banned from the group' : 'Member unbanned',
    });
  } catch (err) {
    sendError(res, err, 'Failed to update member');
  }
}

async function getAdminForumDiscussions(req, res) {
  try {
    const data = await forum.listAdminForumDiscussions({
      groupId: req.query.groupId,
      search: req.query.search,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load discussions');
  }
}

async function getAdminForumDiscussion(req, res) {
  try {
    const data = await forum.getAdminForumDiscussion(req.params.discussionId);
    if (!data) return res.status(404).json({ success: false, message: 'Discussion not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load discussion');
  }
}

async function patchAdminForumDiscussion(req, res) {
  try {
    const data = await forum.updateAdminForumDiscussion(req.params.discussionId, req.body || {});
    res.status(200).json({ success: true, data, message: 'Discussion updated' });
  } catch (err) {
    sendError(res, err, 'Failed to update discussion');
  }
}

async function deleteAdminForumComment(req, res) {
  try {
    const data = await forum.removeAdminForumComment(req.params.discussionId, req.params.commentId);
    res.status(200).json({ success: true, data, message: 'Comment removed' });
  } catch (err) {
    sendError(res, err, 'Failed to remove comment');
  }
}

module.exports = {
  getAdminForumGroups,
  getAdminForumGroup,
  patchAdminForumGroup,
  patchAdminForumMember,
  getAdminForumDiscussions,
  getAdminForumDiscussion,
  patchAdminForumDiscussion,
  deleteAdminForumComment,
};
