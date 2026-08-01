const {
  getJobsOverview,
  getJobsTickets,
  getJobsReports,
  getJobsDisputes,
  getJobsGigsPostings,
  getJobsGigsPostingDetail,
  updateJobsGigsPosting,
  getUserJobsHistory,
} = require('../Repositories/JobsModeratorRepositories');
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
} = require('../Repositories/AdminTicketsRepositories');
const {
  getViolationsAndRestrictions,
  issueViolation,
  updateAccountRestriction,
} = require('../Repositories/ModeratorRepositories');
const { JOBS_REPORT_TYPES, isReportTypeInScope } = require('../lib/reportEnums');

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
    const data = await getTicketDetail(req.params.id, req.session);
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
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
  }
}

async function postDisputeMessage(req, res) {
  try {
    const { body, isInternal, audience, visibleToParties, visibleToPublic } = req.body;
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }
    const data = await addDisputeMessage(req.params.id, body.trim(), req.session, {
      isInternal: Boolean(isInternal),
      audience,
      visibleToParties: Boolean(visibleToParties),
      visibleToPublic: Boolean(visibleToPublic),
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
    const data = await updateJobsGigsPosting(req.params.type, req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Posting not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating posting:', err);
    res.status(500).json({ success: false, message: 'Failed to update posting' });
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
    const data = await getReportDetail(req.params.id, req.session);
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
    const existing = await getReportDetail(req.params.id, req.session);
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
    const isClient = /assign|already assigned|staff profile|not found/i.test(msg);
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
  }
}

module.exports = {
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
  getRestrictions,
  postViolation,
  patchRestriction,
  getReports,
  getReport,
  patchReport,
};
