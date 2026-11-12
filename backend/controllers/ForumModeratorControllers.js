const {
  getForumOverview,
  getForumTickets,
  getForumReports,
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  updateReport,
  getReportDetail,
  getViolationsAndRestrictions,
  issueViolation,
  updateAccountRestriction,
} = require('../services/ForumModeratorServices');
// Group and discussion moderation is the same service the admin console calls,
// so this desk gets the same guards and the same account-activity audit trail.
const forumContent = require('../services/ForumContentModerationServices');
const { FORUM_REPORT_TYPES, isReportTypeInScope } = require('../lib/ReportEnums');

function sendForumContentError(res, err, fallback) {
  const message = String(err?.message || '');
  const status = err?.statusCode || (message.includes('MongoDB') ? 503 : 500);
  if (status >= 500 && !message.includes('MongoDB')) console.error(fallback, err);
  res.status(status).json({ success: false, message: status < 500 || message.includes('MongoDB') ? message : fallback });
}
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
    const data = await getTicketDetail(req.params.id, req.session, { assignableQueue: 'forum' });
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
    const msg =
      err?.message?.includes('not valid for') || err?.message?.includes('type is required') ||
        err?.message?.includes('only be changed when escalating')
        ? err.message
        : 'Failed to update ticket';
    res
      .status(
        err?.message?.includes('not valid for') || err?.message?.includes('type is required') ||
        err?.message?.includes('only be changed when escalating')
          ? 400
          : 500
      )
      .json({ success: false, message: msg });
  }
}

async function postTicketMessage(req, res) {
  try {
    const { body, isInternal, attachments } = req.body;
    if (!body?.trim() && !(Array.isArray(attachments) && attachments.length)) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }
    const data = await addTicketMessage(req.params.id, (body || '').trim(), req.session, Boolean(isInternal), attachments, req.body?.replyToMessageId);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error adding ticket message:', err);
    const status = err?.statusCode || (err?.message?.includes('MongoDB') ? 503 : 500);
    const msg = status < 500 || err?.message?.includes('MongoDB') ? err.message : 'Failed to add message';
    res.status(status).json({ success: false, message: msg });
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

async function getReport(req, res) {
  try {
    const data = await getReportDetail(req.params.id, req.session, { assignableQueue: 'forum' });
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!isReportTypeInScope(data.report?.targetType, FORUM_REPORT_TYPES)) {
      return res.status(403).json({ success: false, message: 'Report is outside the forum queue' });
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching forum report detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load report' });
  }
}

async function patchReport(req, res) {
  try {
    const existing = await getReportDetail(req.params.id, req.session, { assignableQueue: 'forum' });
    if (!existing) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!isReportTypeInScope(existing.report?.targetType, FORUM_REPORT_TYPES)) {
      return res.status(403).json({ success: false, message: 'Report is outside the forum queue' });
    }
    const data = await updateReport(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating report:', err);
    const msg = err.message || 'Failed to update report';
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({ success: false, message: msg });
    }
    const isClient = /assign|already assigned|staff profile|not found/i.test(msg);
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
  }
}

async function getGroups(req, res) {
  try {
    const data = await forumContent.listForumGroupsForStaff({
      search: req.query.search,
      status: req.query.status,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendForumContentError(res, err, 'Failed to load forum groups');
  }
}

async function getGroup(req, res) {
  try {
    const data = await forumContent.getForumGroupForStaff(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Group not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendForumContentError(res, err, 'Failed to load forum group');
  }
}

async function patchGroup(req, res) {
  try {
    const data = await forumContent.setForumGroupVisibility(
      req.params.id,
      req.body || {},
      req.session
    );
    res.status(200).json({
      success: true,
      data,
      message: data?.status === 'active' ? 'Group is active again' : 'Group archived',
    });
  } catch (err) {
    sendForumContentError(res, err, 'Failed to update forum group');
  }
}

async function getDiscussions(req, res) {
  try {
    const data = await forumContent.listForumDiscussionsForStaff({
      groupId: req.query.groupId,
      search: req.query.search,
      status: req.query.status,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendForumContentError(res, err, 'Failed to load discussions');
  }
}

async function getDiscussion(req, res) {
  try {
    const data = await forumContent.getForumDiscussionForStaff(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Discussion not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendForumContentError(res, err, 'Failed to load discussion');
  }
}

async function patchDiscussion(req, res) {
  try {
    const data = await forumContent.setForumDiscussionState(
      req.params.id,
      req.body || {},
      req.session
    );
    res.status(200).json({ success: true, data, message: 'Discussion updated' });
  } catch (err) {
    sendForumContentError(res, err, 'Failed to update discussion');
  }
}

async function patchGroupMember(req, res) {
  try {
    const data = await forumContent.banForumGroupMember(
      req.params.id,
      req.params.memberId,
      req.body || {},
      req.session
    );
    res.status(200).json({
      success: true,
      data,
      message: req.body?.isBanned ? 'Member banned from the group' : 'Member unbanned',
    });
  } catch (err) {
    sendForumContentError(res, err, 'Failed to update member');
  }
}

async function deleteComment(req, res) {
  try {
    const data = await forumContent.removeForumComment(
      req.params.id,
      req.params.commentId,
      req.session
    );
    res.status(200).json({ success: true, data, message: 'Comment removed' });
  } catch (err) {
    sendForumContentError(res, err, 'Failed to remove comment');
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
    const { accountId, warningId, type, title, reason, points } = req.body;
    if (!accountId || !(warningId || type || title)) {
      return res.status(400).json({ success: false, message: 'accountId and a predefined warning are required' });
    }
    const data = await issueViolation(accountId, { warningId, type: type || title, reason, points, duration: req.body?.duration, days: req.body?.days, endsAt: req.body?.endsAt }, req.session);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error issuing violation:', err);
    res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Failed to issue violation' });
  }
}

async function patchRestriction(req, res) {
  try {
    const data = await updateAccountRestriction(req.params.id, req.body.action || req.body.status, req.session, { duration: req.body?.duration, days: req.body?.days, endsAt: req.body?.endsAt, reason: req.body?.reason, punishmentId: req.body?.punishmentId || req.body?.punishment_id, customDuration: req.body?.customDuration === true || req.body?.custom_duration === true });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating account restriction:', err);
    res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Failed to update restriction' });
  }
}

async function getDisputes(req, res) {
  try {
    const { fetchScopedDisputes } = require('../repositories/ModeratorSharedRepositories');
    const data = await fetchScopedDisputes({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching forum disputes:', err);
    res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
}

async function getDispute(req, res) {
  try {
    const { getDisputeDetail } = require('../repositories/AdminTicketsRepositories');
    const data = await getDisputeDetail(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching forum dispute detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load dispute' });
  }
}

async function patchDispute(req, res) {
  try {
    const { updateDispute } = require('../repositories/AdminTicketsRepositories');
    const data = await updateDispute(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating dispute:', err);
    const msg = err.message || 'Failed to update dispute';
    const isClient =
      /assign yourself|view only|cannot|only admin|only the requester|not found|invalid/i.test(msg);
    const statusCode = err.statusCode || (msg.includes('MongoDB') ? 503 : isClient ? 400 : 500);
    res.status(statusCode).json({ success: false, message: msg });
  }
}

async function postDisputeMessage(req, res) {
  try {
    const { addDisputeMessage } = require('../repositories/AdminTicketsRepositories');
    const { body, isInternal, audience, visibleToParties, visibleToPublic, replyToId, attachments } =
      req.body;
    const files = Array.isArray(attachments) ? attachments : [];
    if (!body?.trim() && !files.length) {
      return res
        .status(400)
        .json({ success: false, message: 'Write a message or attach a file' });
    }
    const data = await addDisputeMessage(req.params.id, String(body || '').trim(), req.session, {
      isInternal: Boolean(isInternal),
      audience,
      visibleToParties: Boolean(visibleToParties),
      visibleToPublic: Boolean(visibleToPublic),
      replyToId: replyToId ? String(replyToId) : null,
      attachments: files,
    });
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error adding dispute message:', err);
    const msg = err?.message || 'Failed to add message';
    if (msg.includes('MongoDB')) {
      return res.status(503).json({ success: false, message: msg });
    }
    const isClient = /permission|assign yourself|view only|could not match/i.test(msg);
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
  }
}

async function patchDisputeMessage(req, res) {
  try {
    const { setDisputeMessageAudience } = require('../repositories/AdminTicketsRepositories');
    const { audience, publish } = req.body;
    let nextAudience = audience;
    if (publish === true) nextAudience = 'parties';
    if (publish === false) nextAudience = audience || 'author_and_staff';
    if (!nextAudience) {
      return res.status(400).json({ success: false, message: 'audience or publish is required' });
    }
    const data = await setDisputeMessageAudience(
      req.params.id,
      req.params.messageId,
      nextAudience,
      req.session
    );
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating dispute message:', err);
    const msg = err?.message || 'Failed to update message';
    if (msg.includes('MongoDB')) {
      return res.status(503).json({ success: false, message: msg });
    }
    const isClient = /assign yourself|invalid|not found|permission/i.test(msg);
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
  }
}

module.exports = {
  getOverview,
  getTickets,
  getTicket,
  patchTicket,
  postTicketMessage,
  getReports,
  getReport,
  patchReport,
  getGroups,
  getGroup,
  patchGroup,
  patchGroupMember,
  getDiscussions,
  getDiscussion,
  patchDiscussion,
  deleteComment,
  getRestrictions,
  postViolation,
  patchRestriction,
  getDisputes,
  getDispute,
  patchDispute,
  postDisputeMessage,
  patchDisputeMessage,
};
