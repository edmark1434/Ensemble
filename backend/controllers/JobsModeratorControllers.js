const {
  getJobsOverview,
  getJobsTickets,
  getJobsReports,
  getJobsDisputes,
  getJobsGigsPostings,
  getJobsGigsPostingDetail,
  updateJobsGigsPosting,
  getUserJobsHistory,
} = require('../repositories/JobsModeratorRepositories');
const {
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  updateDispute,
  getDisputeDetail,
  addDisputeMessage,
  setDisputeMessageAudience,
  getReportDetail,
  updateReport,
} = require('../repositories/AdminTicketsRepositories');
const { JOBS_REPORT_TYPES, isReportTypeInScope } = require('../lib/ReportEnums');
const { JOBS_TYPES, normalizeTicketType } = require('../lib/TicketEnums');

/** The Jobs & Gigs desk may only read or act on tickets filed under a Jobs & Gigs type. */
function isJobsTicket(ticket) {
  const type = normalizeTicketType(ticket?.type || ticket?.category, null);
  return Boolean(type && JOBS_TYPES.includes(type));
}

async function loadScopedTicket(req, res) {
  const detail = await getTicketDetail(req.params.id, req.session, { assignableQueue: 'jobs' });
  if (!detail) {
    res.status(404).json({ success: false, message: 'Ticket not found' });
    return null;
  }
  if (!isJobsTicket(detail.ticket)) {
    res.status(403).json({ success: false, message: 'Ticket is outside the Jobs & Gigs queue' });
    return null;
  }
  return detail;
}

/**
 * Route guard for the shared message edit/delete handlers, so a Jobs & Gigs moderator
 * cannot reach a message on a ticket outside this queue by guessing its id.
 */
async function requireJobsTicket(req, res, next) {
  try {
    if (await loadScopedTicket(req, res)) next();
  } catch (err) {
    console.error('Error checking jobs ticket scope:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

/** Caller mistakes from `updateTicket` (bad move target, missing type, no permission). */
function ticketUpdateClientStatus(message) {
  const msg = String(message || '');
  if (/only a moderator or admin|assign yourself|permission/i.test(msg)) return 403;
  if (/not valid for|type is required|only be changed when escalating|unknown escalate role|invalid/i.test(msg)) {
    return 400;
  }
  return null;
}

async function getOverview(req, res) {
  try {
    const data = await getJobsOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching jobs overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load jobs & gigs overview' });
  }
}

async function getTickets(req, res) {
  try {
    const data = await getJobsTickets({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching jobs tickets:', err);
    res.status(500).json({ success: false, message: 'Failed to load tickets' });
  }
}

async function getTicket(req, res) {
  try {
    const data = await loadScopedTicket(req, res);
    if (!data) return;
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

/**
 * Update a Jobs & Gigs ticket. Sending `assigned_role` + `type` moves it: to another
 * moderator queue (escalation) or to the right Jobs & Gigs type when it was miscategorised.
 */
async function patchTicket(req, res) {
  try {
    if (!(await loadScopedTicket(req, res))) return;
    const data = await updateTicket(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    const status = err?.statusCode || ticketUpdateClientStatus(err?.message) || 500;
    if (status >= 500) console.error('Error updating ticket:', err);
    res
      .status(status)
      .json({ success: false, message: status < 500 ? err.message : 'Failed to update ticket' });
  }
}

async function postTicketMessage(req, res) {
  try {
    if (!(await loadScopedTicket(req, res))) return;
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

async function getDisputes(req, res) {
  try {
    const data = await getJobsDisputes({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching jobs disputes:', err);
    res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
}

async function getDispute(req, res) {
  try {
    const data = await getDisputeDetail(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching jobs dispute detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load dispute' });
  }
}

async function patchDispute(req, res) {
  try {
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
    const msg = err.message || 'Failed to add message';
    const isClient = /permission|assign yourself|MongoDB|not found/i.test(msg);
    res.status(msg.includes('MongoDB') ? 503 : isClient ? 400 : 500).json({ success: false, message: msg });
  }
}

async function patchDisputeMessage(req, res) {
  try {
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

async function getPostings(req, res) {
  try {
    const data = await getJobsGigsPostings({
      type: req.query.type,
      status: req.query.status,
      search: req.query.search,
      sort: req.query.sort,
      limit: req.query.limit,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching jobs/gigs postings:', err);
    res.status(500).json({ success: false, message: 'Failed to load postings' });
  }
}

async function getPosting(req, res) {
  try {
    const data = await getJobsGigsPostingDetail(req.params.type, req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Posting not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching posting detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load posting' });
  }
}

async function patchPosting(req, res) {
  try {
    const data = await updateJobsGigsPosting(
      req.params.type,
      req.params.id,
      req.body || {},
      req.session
    );
    if (!data) return res.status(404).json({ success: false, message: 'Posting not found' });
    res.status(200).json({ success: true, data, message: 'Posting updated' });
  } catch (err) {
    const message = err?.message || 'Failed to update posting';
    const status = err?.statusCode || (/invalid|already|under 500/i.test(message) ? 400 : 500);
    if (status >= 500) console.error('Error updating posting:', err);
    res.status(status).json({ success: false, message: status < 500 ? message : 'Failed to update posting' });
  }
}

async function getUserHistory(req, res) {
  try {
    const data = await getUserJobsHistory(req.params.accountId);
    if (!data) return res.status(404).json({ success: false, message: 'Account not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching user jobs history:', err);
    res.status(500).json({ success: false, message: 'Failed to load user history' });
  }
}

async function getReports(req, res) {
  try {
    const data = await getJobsReports({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching jobs reports:', err);
    res.status(500).json({ success: false, message: 'Failed to load reports' });
  }
}

async function getReport(req, res) {
  try {
    const data = await getReportDetail(req.params.id, req.session, { assignableQueue: 'jobs' });
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!isReportTypeInScope(data.report?.targetType, JOBS_REPORT_TYPES)) {
      return res.status(403).json({ success: false, message: 'Report is outside the jobs & gigs queue' });
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching jobs report detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load report' });
  }
}

async function patchReport(req, res) {
  try {
    const existing = await getReportDetail(req.params.id, req.session, { assignableQueue: 'jobs' });
    if (!existing) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!isReportTypeInScope(existing.report?.targetType, JOBS_REPORT_TYPES)) {
      return res.status(403).json({ success: false, message: 'Report is outside the jobs & gigs queue' });
    }
    const data = await updateReport(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating jobs report:', err);
    const msg = err.message || 'Failed to update report';
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({ success: false, message: msg });
    }
    const isClient = /assign|already assigned|staff profile|not found/i.test(msg);
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
  }
}

module.exports = {
  requireJobsTicket,
  getOverview,
  getTickets,
  getTicket,
  patchTicket,
  postTicketMessage,
  getDisputes,
  getDispute,
  patchDispute,
  postDisputeMessage,
  patchDisputeMessage,
  getPostings,
  getPosting,
  patchPosting,
  getUserHistory,
  getReports,
  getReport,
  patchReport,
};
