const {
  getForumOverview,
  getForumTickets,
  getForumReports,
} = require('../Repositories/ForumModeratorRepositories');
const {
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  updateReport,
} = require('../Repositories/AdminTicketsRepositories');

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
    const data = await getTicketDetail(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

async function patchTicket(req, res) {
  try {
    const data = await updateTicket(Number(req.params.id), req.body, req.session);
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
    const data = await addTicketMessage(Number(req.params.id), body.trim(), req.session, Boolean(isInternal));
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error adding ticket message:', err);
    res.status(500).json({ success: false, message: 'Failed to add message' });
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
    const data = await updateReport(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(500).json({ success: false, message: 'Failed to update report' });
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
};
