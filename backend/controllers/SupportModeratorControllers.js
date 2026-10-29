const {
  getSupportOverview,
  getSupportTickets,
  getSupportReports,
  getSupportDisputes,
  isAdminTicketPayload,
} = require('../repositories/SupportModeratorRepositories');
const {
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  updateDispute,
  getDisputeDetail,
  addDisputeMessage,
  setDisputeMessageAudience,
  updateReport,
  getReportDetail,
} = require('../repositories/AdminTicketsRepositories');
const {
  getViolationsAndRestrictions,
  issueViolation,
  updateAccountRestriction,
} = require('../repositories/ModeratorRepositories');

async function getOverview(req, res) {
  try {
    const data = await getSupportOverview(req.session);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching support overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load support overview' });
  }
}

async function getTickets(req, res) {
  try {
    const data = await getSupportTickets({
      status: req.query.status,
      search: req.query.search,
      type: req.query.type || req.query.category,
      priority: req.query.priority,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching support tickets:', err);
    res.status(500).json({ success: false, message: 'Failed to load tickets' });
  }
}

function isTicketClientError(message) {
  const msg = String(message || '');
  return (
    msg.includes('not valid for') ||
    msg.includes('type is required') ||
    msg.includes('only be changed when escalating') ||
    msg.includes('cannot') ||
    msg.includes('Cannot') ||
    msg.includes('Only ') ||
    msg.includes('Pick ') ||
    msg.includes('No pending') ||
    msg.includes('Unknown ticket action') ||
    msg.includes('Could not match') ||
    msg.includes('Staff member not found') ||
    msg.includes('already own')
  );
}

async function getTicket(req, res) {
  try {
    const data = await getTicketDetail(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (isAdminTicketPayload(data.ticket || data)) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

async function patchTicket(req, res) {
  try {
    const existing = await getTicketDetail(req.params.id, req.session);
    if (!existing) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (isAdminTicketPayload(existing.ticket || existing)) {
      return res.status(403).json({ success: false, message: 'Admin tickets are not available to Support Moderators' });
    }
    const data = await updateTicket(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating ticket:', err);
    const client = isTicketClientError(err?.message);
    res.status(client ? 400 : 500).json({
      success: false,
      message: client ? err.message : 'Failed to update ticket',
    });
  }
}

async function postTicketMessage(req, res) {
  try {
    const { body, isInternal, attachments } = req.body;
    if (!body?.trim() && !(Array.isArray(attachments) && attachments.length)) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }
    const existing = await getTicketDetail(req.params.id, req.session);
    if (!existing) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (isAdminTicketPayload(existing.ticket || existing)) {
      return res.status(403).json({ success: false, message: 'Admin tickets are not available to Support Moderators' });
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
    const data = await getSupportReports({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ success: false, message: 'Failed to load reports' });
  }
}

async function getReport(req, res) {
  try {
    const data = await getReportDetail(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching report detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load report' });
  }
}

async function patchReport(req, res) {
  try {
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

async function getDisputes(req, res) {
  try {
    const data = await getSupportDisputes({
      status: req.query.status,
      search: req.query.search,
      entityType: req.query.entityType,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching disputes:', err);
    res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
}

async function getDispute(req, res) {
  try {
    const data = await getDisputeDetail(req.params.id, req.session);
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
    const msg = err.message || 'Failed to update dispute';
    const isClient =
      /assign yourself|view only|cannot|only admin|only the requester|not found|invalid/i.test(msg);
    const statusCode = err.statusCode || (msg.includes('MongoDB') ? 503 : isClient ? 400 : 500);
    res.status(statusCode).json({ success: false, message: msg });
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
    const msg = err?.message || 'Failed to add message';
    if (msg.includes('MongoDB')) {
      return res.status(503).json({ success: false, message: msg });
    }
    const isClient = /assign yourself|view only|could not match/i.test(msg);
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
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
    const isClient = /assign yourself|invalid|not found/i.test(msg);
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
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

const { postTicketCreditAdjustment, patchAdminTicketMessage, deleteAdminTicketMessage } = require('./AdminTicketsControllers');

async function guardSupportTicket(req, res) {
  const existing = await getTicketDetail(req.params.id, req.session);
  if (!existing) {
    res.status(404).json({ success: false, message: 'Ticket not found' });
    return false;
  }
  if (isAdminTicketPayload(existing.ticket || existing)) {
    res.status(403).json({ success: false, message: 'Admin tickets are not available to Support Moderators' });
    return false;
  }
  return true;
}

async function patchTicketMessage(req, res) {
  try {
    if (!(await guardSupportTicket(req, res))) return;
    return patchAdminTicketMessage(req, res);
  } catch (err) {
    console.error('Error updating ticket message:', err);
    res.status(500).json({ success: false, message: 'Failed to update message' });
  }
}

async function deleteTicketMessage(req, res) {
  try {
    if (!(await guardSupportTicket(req, res))) return;
    return deleteAdminTicketMessage(req, res);
  } catch (err) {
    console.error('Error deleting ticket message:', err);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
}

module.exports = {
  getOverview,
  getTickets,
  getTicket,
  patchTicket,
  postTicketMessage,
  patchTicketMessage,
  deleteTicketMessage,
  postTicketCreditAdjustment,
  getReports,
  getReport,
  patchReport,
  getDisputes,
  getDispute,
  patchDispute,
  postDisputeMessage,
  patchDisputeMessage,
  getRestrictions,
  postViolation,
  patchRestriction,
};
