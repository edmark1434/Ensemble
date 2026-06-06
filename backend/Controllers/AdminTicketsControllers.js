const {
  getTicketsOverview,
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  updateDispute,
  updateReport,
} = require('../Repositories/AdminTicketsRepositories');

async function getAdminTicketsOverview(req, res) {
  try {
    const data = await getTicketsOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching tickets overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket management data' });
  }
}

async function getAdminTicketDetail(req, res) {
  try {
    const data = await getTicketDetail(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

async function patchAdminTicket(req, res) {
  try {
    const data = await updateTicket(Number(req.params.id), req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating ticket:', err);
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
}

async function postAdminTicketMessage(req, res) {
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

async function patchAdminDispute(req, res) {
  try {
    const data = await updateDispute(Number(req.params.id), req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating dispute:', err);
    res.status(500).json({ success: false, message: 'Failed to update dispute' });
  }
}

async function patchAdminReport(req, res) {
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
  getAdminTicketsOverview,
  getAdminTicketDetail,
  patchAdminTicket,
  postAdminTicketMessage,
  patchAdminDispute,
  patchAdminReport,
};
