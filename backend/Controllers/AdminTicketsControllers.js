const {
  getTicketsOverview,
  getTicketDetail,
  createSupportTicket,
  updateTicket,
  addTicketMessage,
  updateDispute,
  getDisputeDetail,
  addDisputeMessage,
  updateReport,
  getReportDetail,
} = require('../Repositories/AdminTicketsRepositories');
const { pool } = require('../lib/database');

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
    const data = await getTicketDetail(req.params.id);
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
      channel,
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
        channel,
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
    const msg =
      err?.message?.includes('not valid for') ||
      err?.message?.includes('type is required') ||
      err?.message?.includes('only be changed when escalating')
        ? err.message
        : 'Failed to update ticket';
    res
      .status(
        err?.message?.includes('not valid for') ||
          err?.message?.includes('type is required') ||
          err?.message?.includes('only be changed when escalating')
          ? 400
          : 500
      )
      .json({ success: false, message: msg });
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
    res.status(500).json({ success: false, message: 'Failed to update dispute' });
  }
}

async function getAdminDisputeDetail(req, res) {
  try {
    const data = await getDisputeDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching dispute detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load dispute' });
  }
}

async function postAdminDisputeMessage(req, res) {
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

async function patchAdminReport(req, res) {
  try {
    const data = await updateReport(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
}

async function getAdminReportDetail(req, res) {
  try {
    const data = await getReportDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching report detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load report' });
  }
}

/** Public/user ticket intake — uses session account, or looks up account by email. */
async function createPublicTicket(req, res) {
  try {
    const { subject, reason, type, category, priority, channel, description, email } = req.body;
    const subjectOrReason = (reason || subject || '').trim();
    if (!subjectOrReason) {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }
    if (!description?.trim()) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    let requesterAccountId = req.session?.account_id || req.session?.accountId || null;

    if (!requesterAccountId) {
      if (!email?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Email is required when not logged in',
        });
      }
      const found = await pool.query(
        `SELECT u.account_id
         FROM users u
         WHERE LOWER(u.email_address) = LOWER($1)
         LIMIT 1`,
        [email.trim()]
      );
      if (!found.rows.length) {
        return res.status(404).json({
          success: false,
          message: 'No account found for that email. Sign up or log in to submit a ticket.',
        });
      }
      requesterAccountId = found.rows[0].account_id;
    }

    const data = await createSupportTicket(
      {
        subject: subjectOrReason,
        reason: subjectOrReason,
        type: type || category || 'Other',
        category,
        priority: priority || 'Medium',
        channel: channel || 'web',
        description: description.trim(),
        requesterAccountId,
      },
      req.session?.account_id
        ? req.session
        : { account_id: requesterAccountId, type: 'User', username: email || 'User' }
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
      SELECT ticket_id, ticket_number, reason, type, priority, status, channel,
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
        channel: r.channel,
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

module.exports = {
  getAdminTicketsOverview,
  getAdminTicketDetail,
  createAdminTicket,
  patchAdminTicket,
  postAdminTicketMessage,
  getAdminDisputeDetail,
  patchAdminDispute,
  postAdminDisputeMessage,
  getAdminReportDetail,
  patchAdminReport,
  createPublicTicket,
  listMyTickets,
  getMyTicket,
  postMyTicketMessage,
};
