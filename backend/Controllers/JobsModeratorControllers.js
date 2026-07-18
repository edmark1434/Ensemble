const {
  getJobsOverview,
  getJobsTickets,
  getJobsDisputes,
} = require('../Repositories/JobsModeratorRepositories');
const {
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  updateDispute,
} = require('../Repositories/AdminTicketsRepositories');

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

async function getDisputes(req, res) {
  try {
    const data = await getJobsDisputes({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching jobs disputes:', err);
    res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
}

async function patchDispute(req, res) {
  try {
    const data = await updateDispute(Number(req.params.id), req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating dispute:', err);
    res.status(500).json({ success: false, message: 'Failed to update dispute' });
  }
}

module.exports = {
  getOverview,
  getTickets,
  getTicket,
  patchTicket,
  postTicketMessage,
  getDisputes,
  patchDispute,
};
