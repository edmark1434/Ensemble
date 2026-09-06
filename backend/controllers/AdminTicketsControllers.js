const {
  getTicketsOverview,
  getTicketDetail,
  createSupportTicket,
  getTicketCatalog,
  updateTicket,
  addTicketMessage,
  updateDispute,
  getDisputeDetail,
  addDisputeMessage,
  setDisputeMessageAudience,
  updateReport,
  getReportDetail,
} = require('../repositories/AdminTicketsRepositories');
const { pool } = require('../lib/Database');
const { randomUUID } = require('crypto');
const { createReport } = require('../repositories/ModeratorSharedRepositories');

async function getAdminTicketsOverview(req, res) {
  try {
    const data = await getTicketsOverview(req.session);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching tickets overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket management data' });
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

async function getAdminTicketDetail(req, res) {
  try {
    const data = await getTicketDetail(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

async function createAdminTicket(req, res) {
  try {
    const {
      subject,
      reason,
      type,
      category,
      priority,
      description,
      requesterAccountId,
      assignedStaffId,
      handledByStaffId,
    } = req.body;
    const subjectOrReason = (reason || subject || '').trim();
    if (!subjectOrReason) {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }
    const data = await createSupportTicket(
      {
        subject: subjectOrReason,
        reason: subjectOrReason,
        type: type || category,
        category,
        priority,
        description,
        requesterAccountId: requesterAccountId || req.session?.account_id,
        assignedStaffId: handledByStaffId || assignedStaffId,
        handledByStaffId: handledByStaffId || assignedStaffId,
      },
      req.session
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create ticket' });
  }
}

async function patchAdminTicket(req, res) {
  try {
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

async function postAdminTicketMessage(req, res) {
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

async function patchAdminDispute(req, res) {
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

async function getAdminDisputeDetail(req, res) {
  try {
    const data = await getDisputeDetail(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching dispute detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load dispute' });
  }
}

async function postAdminDisputeMessage(req, res) {
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

async function patchAdminDisputeMessage(req, res) {
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

async function patchAdminReport(req, res) {
  try {
    const data = await updateReport(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating report:', err);
    const msg = err.message || 'Failed to update report';
    const isClient = /assign|already assigned|staff profile|not found/i.test(msg);
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
  }
}

async function getAdminReportDetail(req, res) {
  try {
    const data = await getReportDetail(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching report detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load report' });
  }
}

/** Public/user ticket intake — uses session account, or looks up account by email. */
async function getPublicTicketCatalog(_req, res) {
  try {
    const catalog = await getTicketCatalog();
    res.status(200).json({
      success: true,
      data: {
        types: catalog.types,
        typeDetails: catalog.typeDetails,
      },
    });
  } catch (err) {
    console.error('Error loading public ticket catalog:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket types' });
  }
}

async function createPublicTicket(req, res) {
  try {
    const {
      subject,
      reason,
      type,
      category,
      priority,
      description,
      account_id,
    } = req.body;
    const subjectOrReason = (reason || subject || '').trim();
    if (!subjectOrReason) {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }
    if (!description?.trim()) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    const requesterAccountId = req.session?.account_id || req.session?.accountId || null;
    if (!requesterAccountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!account_id || String(account_id) !== String(requesterAccountId)) {
      return res.status(403).json({
        success: false,
        message: 'Ticket account does not match the authenticated account',
      });
    }

    const data = await createSupportTicket(
      {
        subject: subjectOrReason,
        reason: subjectOrReason,
        type: type || category || 'Other',
        category,
        priority: priority || 'Medium',
        description: description.trim(),
        requesterAccountId,
      },
      req.session
    );

    res.status(201).json({
      success: true,
      data: {
        ticketId: data.ticket.id,
        ticketNumber: data.ticket.number,
        chatAvailable: data.chatAvailable,
      },
    });
  } catch (err) {
    console.error('Error creating public ticket:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create ticket' });
  }
}

async function listMyTickets(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const result = await pool.query(
      `
      SELECT ticket_id, ticket_number, reason, type, priority, status,
             message_count, last_message_at, created_at, updated_at, resolved_at
      FROM tickets
      WHERE account_id = $1 AND deleted_at IS NULL
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      `,
      [accountId]
    );
    res.status(200).json({
      success: true,
      data: result.rows.map((r) => ({
        id: r.ticket_id,
        number: r.ticket_number,
        subject: r.reason,
        reason: r.reason,
        type: r.type,
        category: r.type,
        priority: r.priority,
        status: r.status,
        messageCount: Number(r.message_count || 0),
        lastMessageAt: r.last_message_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        closedAt: r.resolved_at,
        resolvedAt: r.resolved_at,
      })),
    });
  } catch (err) {
    console.error('Error listing user tickets:', err);
    res.status(500).json({ success: false, message: 'Failed to load tickets' });
  }
}

async function getMyTicket(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const data = await getTicketDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (String(data.ticket.requester.accountId) !== String(accountId)) {
      return res.status(403).json({ success: false, message: 'Not your ticket' });
    }
    // Hide staff internal notes from requesters.
    data.messages = (data.messages || []).filter((m) => !m.isInternal);
    delete data.assignableStaff;
    delete data.permissions;
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching user ticket:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

async function postMyTicketMessage(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { body } = req.body;
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }
    const existing = await getTicketDetail(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (String(existing.ticket.requester.accountId) !== String(accountId)) {
      return res.status(403).json({ success: false, message: 'Not your ticket' });
    }
    const data = await addTicketMessage(req.params.id, body.trim(), req.session, false);
    data.messages = (data.messages || []).filter((m) => !m.isInternal);
    delete data.assignableStaff;
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error adding user ticket message:', err);
    const msg = err?.message?.includes('MongoDB') ? err.message : 'Failed to add message';
    res.status(err?.message?.includes('MongoDB') ? 503 : 500).json({ success: false, message: msg });
  }
}

async function createMyTechnicalReport(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.body?.account_id && String(req.body.account_id) !== String(accountId)) {
      return res.status(403).json({ success: false, message: 'Account does not match the authenticated session' });
    }

    const subject = String(req.body?.subject || '').trim();
    const description = String(req.body?.description || '').trim();
    if (!subject || subject.length > 100) {
      return res.status(400).json({ success: false, message: 'Subject is required and must not exceed 100 characters' });
    }
    if (description.length < 20 || description.length > 5000) {
      return res.status(400).json({ success: false, message: 'Description must contain 20 to 5,000 characters' });
    }

    const report = await createReport({
      reportNumber: `RPT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`,
      reporterAccountId: accountId,
      targetAccountId: accountId,
      targetType: 'technical_problem',
      targetId: String(accountId),
      type: subject,
      description,
      referenceTable: 'accounts',
      referencePrefix: 'settings',
    });
    return res.status(201).json({ success: true, data: report });
  } catch (err) {
    console.error('Error creating technical report:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit technical report' });
  }
}

module.exports = {
  getAdminTicketsOverview,
  getAdminTicketDetail,
  createAdminTicket,
  patchAdminTicket,
  postAdminTicketMessage,
  getAdminDisputeDetail,
  patchAdminDispute,
  postAdminDisputeMessage,
  patchAdminDisputeMessage,
  getAdminReportDetail,
  patchAdminReport,
  getPublicTicketCatalog,
  createPublicTicket,
  listMyTickets,
  getMyTicket,
  postMyTicketMessage,
  createMyTechnicalReport,
};
