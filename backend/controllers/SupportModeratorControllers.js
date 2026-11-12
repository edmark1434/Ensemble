const {
  getSupportOverview,
  getSupportTickets,
  getSupportReports,
  getSupportDisputes,
  isAdminTicketPayload,
  isSupportScopedTicket,
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
const { applyFinancialResolution } = require('../services/DisputeFinancialServices');

/**
 * Every ticket route on this desk goes through here: a Support Moderator may only read or
 * change a ticket inside the support queue, and never an Admin-owned one. The frontend scopes
 * the list as well, but this is the boundary that counts.
 */
const OUT_OF_SCOPE_MESSAGE =
  'That ticket belongs to another queue. Only its own moderator desk or an Admin can open it.';

function ticketScopeDenial(ticket) {
  if (isAdminTicketPayload(ticket)) {
    return { status: 403, message: 'Admin tickets are not available to Support Moderators' };
  }
  if (!isSupportScopedTicket(ticket)) {
    return { status: 403, message: OUT_OF_SCOPE_MESSAGE };
  }
  return null;
}

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
    if (ticketScopeDenial(data.ticket || data)) {
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
    const denied = ticketScopeDenial(existing.ticket || existing);
    if (denied) return res.status(denied.status).json({ success: false, message: denied.message });
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
    const denied = ticketScopeDenial(existing.ticket || existing);
    if (denied) return res.status(denied.status).json({ success: false, message: denied.message });
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
    // `scope=all` opens the whole platform queue; the desk defaults to support-owned targets.
    const scope = String(req.query.scope || 'support').toLowerCase() === 'all' ? 'all' : 'support';
    const data = await getSupportReports({ status: req.query.status, scope });
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

async function postFinancialResolution(req, res) {
  try {
    const data = await applyFinancialResolution(req.params.id, req.body || {}, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error applying dispute financial resolution:', err);
    const msg = err.message || 'Failed to apply financial resolution';
    const statusCode = err.statusCode || (/not found/i.test(msg) ? 404 : /cannot|only admin|invalid|must be|required/i.test(msg) ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      message: msg,
      code: err.code || undefined,
    });
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

// Support enforcement happens inside a report case and in User & Team → Users, so this console
// has no standalone restrictions desk. The forum and jobs consoles keep theirs.

const {
  postTicketCreditAdjustment: postAdminTicketCreditAdjustment,
  patchAdminTicketMessage,
  deleteAdminTicketMessage,
} = require('./AdminTicketsControllers');

async function guardSupportTicket(req, res) {
  const existing = await getTicketDetail(req.params.id, req.session);
  if (!existing) {
    res.status(404).json({ success: false, message: 'Ticket not found' });
    return false;
  }
  const denied = ticketScopeDenial(existing.ticket || existing);
  if (denied) {
    res.status(denied.status).json({ success: false, message: denied.message });
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

async function postTicketCreditAdjustment(req, res) {
  try {
    if (!(await guardSupportTicket(req, res))) return;
    return postAdminTicketCreditAdjustment(req, res);
  } catch (err) {
    console.error('Error recording ticket credit adjustment:', err);
    res.status(500).json({ success: false, message: 'Failed to record credit adjustment' });
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
  postFinancialResolution,
  patchDispute,
  postDisputeMessage,
  patchDisputeMessage,
};
