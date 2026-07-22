const {
  getSupportOverview,
  getSupportTickets,
  getSupportReports,
  getSupportDisputes,
  getChatQueue,
} = require('../Repositories/SupportModeratorRepositories');
const {
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  updateDispute,
  getDisputeDetail,
  addDisputeMessage,
  updateReport,
} = require('../Repositories/AdminTicketsRepositories');
const {
  getViolationsAndRestrictions,
  issueViolation,
  updateAccountRestriction,
} = require('../Repositories/ModeratorRepositories');

async function getOverview(req, res) {
  try {
    const data = await getSupportOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching support overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load support overview' });
  }
}

async function getTickets(req, res) {
  try {
    const data = await getSupportTickets({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching support tickets:', err);
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
    res.status(500).json({ success: false, message: 'Failed to add message' });
  }
}

async function getReports(req, res) {
  try {
    const data = await getSupportReports({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching reports:', err);
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

async function getChat(req, res) {
  try {
    const data = await getChatQueue();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching chat queue:', err);
    res.status(500).json({ success: false, message: 'Failed to load chat queue' });
  }
}

async function getDisputes(req, res) {
  try {
    const data = await getSupportDisputes({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching disputes:', err);
    res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
}

async function getDispute(req, res) {
  try {
    const data = await getDisputeDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching dispute detail:', err);
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
    res.status(500).json({ success: false, message: 'Failed to update dispute' });
  }
}

async function postDisputeMessage(req, res) {
  try {
    const { body, isInternal } = req.body;
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }
    const data = await addDisputeMessage(req.params.id, body.trim(), req.session, Boolean(isInternal));
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error adding dispute message:', err);
    const msg = err?.message?.includes('MongoDB') ? err.message : 'Failed to add message';
    res.status(err?.message?.includes('MongoDB') ? 503 : 500).json({ success: false, message: msg });
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
  getChat,
  getDisputes,
  getDispute,
  patchDispute,
  postDisputeMessage,
  getRestrictions,
  postViolation,
  patchRestriction,
};
