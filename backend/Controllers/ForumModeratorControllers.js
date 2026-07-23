const {
  getForumOverview,
  getForumTickets,
  getForumReports,
  getModeratorForumGroups,
  setForumGroupStatus,
  getModeratorForumDiscussions,
  getModeratorForumDiscussionDetail,
  setForumDiscussionStatus,
  removeForumDiscussionComment,
} = require('../Repositories/ForumModeratorRepositories');
const {
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  updateReport,
} = require('../Repositories/AdminTicketsRepositories');
const {
  getViolationsAndRestrictions,
  issueViolation,
  updateAccountRestriction,
} = require('../Repositories/ModeratorRepositories');

async function getOverview(req, res) {
  try {
    const data = await getForumOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching forum overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load forum overview' });
  }
}

async function getTickets(req, res) {
  try {
    const data = await getForumTickets({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching forum tickets:', err);
    res.status(500).json({ success: false, message: 'Failed to load tickets' });
  }
}

async function getTicket(req, res) {
  try {
    const data = await getTicketDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

async function patchTicket(req, res) {
  try {
    const data = await updateTicket(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating ticket:', err);
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
}

async function postTicketMessage(req, res) {
  try {
    const { body, isInternal } = req.body;
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }
    const data = await addTicketMessage(req.params.id, body.trim(), req.session, Boolean(isInternal));
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error adding ticket message:', err);
    const msg = err?.message?.includes('MongoDB') ? err.message : 'Failed to add message';
    res.status(err?.message?.includes('MongoDB') ? 503 : 500).json({ success: false, message: msg });
  }
}

async function getReports(req, res) {
  try {
    const data = await getForumReports({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching forum reports:', err);
    res.status(500).json({ success: false, message: 'Failed to load reports' });
  }
}

async function patchReport(req, res) {
  try {
    const data = await updateReport(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
}

async function getGroups(req, res) {
  try {
    const data = await getModeratorForumGroups();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching forum groups:', err);
    res.status(500).json({ success: false, message: 'Failed to load forum groups' });
  }
}

async function patchGroup(req, res) {
  try {
    const data = await setForumGroupStatus(req.params.id, req.body.status);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating forum group:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update forum group' });
  }
}

async function getDiscussions(req, res) {
  try {
    const data = await getModeratorForumDiscussions({ groupId: req.query.groupId, search: req.query.search });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching forum discussions:', err);
    res.status(500).json({ success: false, message: 'Failed to load discussions' });
  }
}

async function getDiscussion(req, res) {
  try {
    const data = await getModeratorForumDiscussionDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Discussion not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching discussion detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load discussion' });
  }
}

async function patchDiscussion(req, res) {
  try {
    const data = await setForumDiscussionStatus(req.params.id, req.body.status);
    if (!data) return res.status(404).json({ success: false, message: 'Discussion not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating discussion:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update discussion' });
  }
}

async function deleteComment(req, res) {
  try {
    const data = await removeForumDiscussionComment(req.params.id, req.params.commentId);
    if (!data) return res.status(404).json({ success: false, message: 'Discussion not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error removing comment:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to remove comment' });
  }
}

async function getRestrictions(req, res) {
  try {
    const data = await getViolationsAndRestrictions();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching restrictions:', err);
    res.status(500).json({ success: false, message: 'Failed to load restrictions' });
  }
}

async function postViolation(req, res) {
  try {
    const { accountId, title, reason, points } = req.body;
    if (!accountId || !title) {
      return res.status(400).json({ success: false, message: 'accountId and title are required' });
    }
    const data = await issueViolation(accountId, { title, reason, points }, req.session);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error issuing violation:', err);
    res.status(500).json({ success: false, message: 'Failed to issue violation' });
  }
}

async function patchRestriction(req, res) {
  try {
    const data = await updateAccountRestriction(req.params.id, req.body.status);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating account restriction:', err);
    res.status(500).json({ success: false, message: 'Failed to update restriction' });
  }
}

module.exports = {
  getOverview,
  getTickets,
  getTicket,
  patchTicket,
  postTicketMessage,
  getReports,
  patchReport,
  getGroups,
  patchGroup,
  getDiscussions,
  getDiscussion,
  patchDiscussion,
  deleteComment,
  getRestrictions,
  postViolation,
  patchRestriction,
};
