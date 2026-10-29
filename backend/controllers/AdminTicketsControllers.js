const {
  getTicketsOverview,
  getTicketDetail,
  listParticipantTicketIds,
  searchTicketParticipants,
  addTicketParticipant,
  removeTicketParticipant,
  respondTicketInvite,
  generateTicketTranscript,
  assertCanFileAppeal,
  decideTicketAppeal,
  scheduleTicketClose,
  cancelScheduledTicketClose,
  createSupportTicket,
  getTicketPickers,
  getTicketCatalog,
  updateTicket,
  addTicketMessage,
  updateTicketMessage,
  deleteTicketMessage,
  updateDispute,
  getDisputeDetail,
  addDisputeMessage,
  setDisputeMessageAudience,
  updateReport,
  getReportDetail,
} = require('../repositories/AdminTicketsRepositories');
const {
  normalizeTicketScreenshots,
  listTicketArticles,
  saveTicketArticle,
  deleteTicketArticle,
  submitTicketSatisfaction,
  adjustTicketCredits,
} = require('../repositories/TicketHelpRepositories');
const { pool } = require('../lib/Database');
const { createReport } = require('../repositories/ModeratorSharedRepositories');
const { createReportNumber, buildSubjectSnapshot } = require('../lib/ReportSubject');
const { createStaffTicketService } = require('../services/TicketServices');

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

async function createStaffTicket(req, res) {
  try {
    if (req.session?.type !== 'Staff') {
      return res.status(403).json({ success: false, message: 'Forbidden: Staff role required' });
    }
    const data = await createStaffTicketService(
      {
        subject: req.body?.subject || req.body?.reason,
        reason: req.body?.reason || req.body?.subject,
        type: req.body?.type || req.body?.category,
        priority: req.body?.priority,
        description: req.body?.description,
        requesterAccountId: req.body?.requesterAccountId || req.body?.accountId,
        assignToMe: Boolean(req.body?.assignToMe),
        assignedStaffId: req.body?.handledByStaffId || req.body?.assignedStaffId,
        handledByStaffId: req.body?.handledByStaffId || req.body?.assignedStaffId,
      },
      req.session
    );
    res.status(201).json({
      success: true,
      data,
      message: data?.ticket?.number ? `Ticket ${data.ticket.number} opened` : 'Ticket opened',
    });
  } catch (err) {
    console.error('Error creating staff ticket:', err);
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 400;
    res.status(status).json({ success: false, message: err.message || 'Failed to create ticket' });
  }
}

const createAdminTicket = createStaffTicket;

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
    const screenshots = normalizeTicketScreenshots(req.body?.attachments);
    if (!body?.trim() && !screenshots.length) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }
    const data = await addTicketMessage(
      req.params.id,
      body?.trim() || '',
      req.session,
      Boolean(isInternal),
      req.body?.attachments,
      req.body?.replyToMessageId
    );
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error adding ticket message:', err);
    const status = err?.statusCode || (err?.message?.includes('MongoDB') ? 503 : 500);
    const msg = status < 500 || err?.message?.includes('MongoDB') ? err.message : 'Failed to add message';
    res.status(status).json({ success: false, message: msg });
  }
}

function ticketMessageClientError(message) {
  return /only change your own|only staff|not found|required|nothing to update|mongodb/i.test(String(message || ''));
}

async function patchAdminTicketMessage(req, res) {
  try {
    const patch = {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'body')) patch.body = req.body.body;
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'isInternal')) patch.isInternal = Boolean(req.body.isInternal);
    const data = await updateTicketMessage(req.params.id, req.params.messageId, patch, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating ticket message:', err);
    const message = err?.message || 'Failed to update message';
    const client = ticketMessageClientError(message);
    res.status(message.includes('MongoDB') ? 503 : client ? 400 : 500).json({
      success: false,
      message: client || message.includes('MongoDB') ? message : 'Failed to update message',
    });
  }
}

async function deleteAdminTicketMessage(req, res) {
  try {
    const data = await deleteTicketMessage(req.params.id, req.params.messageId, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error deleting ticket message:', err);
    const message = err?.message || 'Failed to delete message';
    const client = ticketMessageClientError(message);
    res.status(message.includes('MongoDB') ? 503 : client ? 400 : 500).json({
      success: false,
      message: client || message.includes('MongoDB') ? message : 'Failed to delete message',
    });
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
    const statusCode = err.statusCode || (msg.includes('MongoDB') ? 503 : isClient ? 400 : 500);
    res.status(statusCode).json({ success: false, message: msg });
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
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({ success: false, message: msg });
    }
    const isClient = /assign|already assigned|staff profile|not found|queue for this case/i.test(msg);
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
async function getTicketContext(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const data = await getTicketPickers(accountId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error loading ticket context:', err);
    res.status(500).json({ success: false, message: 'Failed to load your projects and orders' });
  }
}

async function getPublicTicketCatalog(_req, res) {
  try {
    const { getPublicTicketTypeDetails } = require('../lib/TicketEnums');
    const typeDetails = getPublicTicketTypeDetails();
    res.status(200).json({
      success: true,
      data: {
        types: typeDetails.map((item) => item.label),
        typeDetails,
      },
    });
  } catch (err) {
    console.error('Error loading public ticket catalog:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket types' });
  }
}

async function createPublicTicket(req, res) {
  try {
    const requesterAccountId = req.session?.account_id || req.session?.accountId || null;
    if (!requesterAccountId) {
      return res.status(401).json({ success: false, message: 'Authentication required to submit a ticket' });
    }

    const {
      subject,
      reason,
      type,
      category,
      priority,
      description,
    } = req.body;
    const { APPEAL_TICKET_TYPE } = require('../lib/AccountRestriction');
    let ticketType = type || category || 'Other';
    const appealOnly = Boolean(req.accountAccess?.banned || req.accountAccess?.locked);
    if (appealOnly) {
      if (String(type || category || APPEAL_TICKET_TYPE).trim() !== APPEAL_TICKET_TYPE) {
        return res.status(403).json({
          success: false,
          code: req.accountAccess.code || 'ACCOUNT_BANNED',
          message: 'This account can only open an appeal ticket.',
        });
      }
      ticketType = APPEAL_TICKET_TYPE;
    }
    if (ticketType === APPEAL_TICKET_TYPE) {
      await assertCanFileAppeal(requesterAccountId);
    }
    const subjectOrReason = (reason || subject || '').trim();
    if (!subjectOrReason) {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }
    if (!description?.trim()) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    const data = await createSupportTicket(
      {
        subject: subjectOrReason,
        reason: subjectOrReason,
        type: ticketType,
        category,
        priority: priority || 'Medium',
        description: description.trim(),
        attachments: req.body?.attachments,
        fields: appealOnly
          ? {
              case_id: req.body?.fields?.case_id || 'Not provided',
              why_reverse: req.body?.fields?.why_reverse || description.trim(),
              evidence: req.body?.fields?.evidence || '',
            }
          : (req.body?.fields ?? {}),
        context: req.body?.context,
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
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 400;
    res.status(status).json({ success: false, message: err.message || 'Failed to create ticket' });
  }
}

async function postTicketAppealDecision(req, res) {
  try {
    const data = await decideTicketAppeal(req.params.id, req.body?.decision, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const decision = data.appealDecision;
    const message = decision === 'accepted'
      ? 'Appeal accepted. The penalty ends in 24 hours and the ticket is closed.'
      : decision === 'denied_permanent'
        ? 'Appeal denied permanently. The ticket is closed.'
        : 'Appeal denied. The ticket is closed. They can appeal again in 12 months.';
    res.status(200).json({ success: true, data, message });
  } catch (err) {
    console.error('Error deciding appeal:', err);
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    res.status(status).json({
      success: false,
      message: status < 500 ? err.message : 'Failed to decide this appeal',
    });
  }
}

function sessionCanReadTicket(data, accountId) {
  if (!data?.ticket || !accountId) return false;
  if (String(data.ticket.requester?.accountId) === String(accountId)) return true;
  return (data.participants || []).some(
    (person) => String(person.accountId) === String(accountId) && person.status === 'active'
  );
}

async function listMyTickets(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const participantTicketIds = await listParticipantTicketIds(accountId);
    const result = await pool.query(
      `
      SELECT ticket_id, ticket_number, reason, type, priority, status,
             message_count, last_message_at, created_at, updated_at, resolved_at
      FROM tickets
      WHERE deleted_at IS NULL
        AND (account_id = $1 OR ticket_id = ANY($2::uuid[]))
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      `,
      [accountId, participantTicketIds]
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

async function listMyDisputes(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { listAccountDisputes } = require('../repositories/DisputeChatRepositories');
    const data = await listAccountDisputes(accountId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error listing user disputes:', err);
    res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
}

async function getMyDispute(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { getAccountDispute } = require('../repositories/DisputeChatRepositories');
    const data = await getAccountDispute(req.params.id, accountId);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching user dispute:', err);
    res.status(500).json({ success: false, message: 'Failed to load dispute' });
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
    if (!sessionCanReadTicket(data, accountId)) {
      return res.status(403).json({ success: false, message: 'Not your ticket' });
    }
    // Hide staff internal notes from requesters.
    data.messages = (data.messages || []).filter((m) => !m.isInternal);
    delete data.assignableStaff;
    delete data.permissions;
    delete data.timeline;
    delete data.payments;
    delete data.articles;
    delete data.canAdjustCredits;
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
    const screenshots = normalizeTicketScreenshots(req.body?.attachments);
    if (!body?.trim() && !screenshots.length) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }
    const existing = await getTicketDetail(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (!sessionCanReadTicket(existing, accountId)) {
      return res.status(403).json({ success: false, message: 'Not your ticket' });
    }
    const data = await addTicketMessage(
      req.params.id,
      body?.trim() || '',
      req.session,
      false,
      req.body?.attachments,
      req.body?.replyToMessageId
    );
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (data.isInternal) return res.status(403).json({ success: false, message: 'Not your ticket' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error adding user ticket message:', err);
    const status = err?.statusCode || (err?.message?.includes('MongoDB') ? 503 : 500);
    const msg = status < 500 || err?.message?.includes('MongoDB') ? err.message : 'Failed to add message';
    res.status(status).json({ success: false, message: msg });
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
      reportNumber: createReportNumber(),
      reporterAccountId: accountId,
      targetAccountId: accountId,
      targetType: 'technical_problem',
      targetId: String(accountId),
      type: subject,
      description,
      referenceTable: 'accounts',
      referencePrefix: 'settings',
      subjectSnapshot: buildSubjectSnapshot({
        kind: 'technical_problem',
        title: subject,
        body: description,
        href: null,
      }),
    });
    return res.status(201).json({ success: true, data: report });
  } catch (err) {
    console.error('Error creating technical report:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit technical report' });
  }
}

async function getAdminTicketArticles(req, res) {
  try {
    const data = await listTicketArticles(req.query.type || null);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load reply guides' });
  }
}

async function postAdminTicketArticle(req, res) {
  try {
    const id = await saveTicketArticle({
      articleId: req.body?.id || null,
      ticketType: req.body?.ticketType,
      title: req.body?.title,
      body: req.body?.body,
      staffId: req.session?.staffId || req.session?.staff_id || null,
    });
    res.status(200).json({ success: true, data: { id } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to save reply guide' });
  }
}

async function deleteAdminTicketArticle(req, res) {
  try {
    const removed = await deleteTicketArticle(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Reply guide not found' });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete reply guide' });
  }
}

async function postTicketCreditAdjustment(req, res) {
  try {
    const role = req.session?.role;
    const data = await adjustTicketCredits({
      ticketId: req.params.id,
      amount: req.body?.amount,
      note: req.body?.note,
      staffId: req.session?.staffId || req.session?.staff_id || null,
      staffRole: role,
      actorAccountId: req.session?.account_id || req.session?.accountId || null,
    });
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await addTicketMessage(
      req.params.id,
      `Credit ${Number(req.body?.amount) > 0 ? 'grant' : 'deduction'} of ${Math.abs(Number(req.body?.amount))} recorded on this ticket. ${String(req.body?.note || '').trim()}`,
      req.session,
      true
    );
    res.status(200).json({ success: true, data, message: 'Credit change recorded on the ticket' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to adjust credits' });
  }
}

async function getTicketParticipantSearch(req, res) {
  try {
    const people = await searchTicketParticipants(req.query.q || req.query.handle || '');
    res.status(200).json({ success: true, data: people });
  } catch (err) {
    console.error('Error searching ticket participants:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode ? err.message : 'Failed to search people',
    });
  }
}

async function postTicketParticipant(req, res) {
  try {
    const accountId = req.body?.accountId || req.body?.account_id;
    const data = await addTicketParticipant(req.params.id, accountId, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({
      success: true,
      data,
      message: data.invitePending
        ? 'Invite sent. They need to accept before they can open the ticket.'
        : 'User added to the ticket',
    });
  } catch (err) {
    console.error('Error adding ticket participant:', err);
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Failed to add user',
    });
  }
}

async function deleteTicketParticipant(req, res) {
  try {
    const data = await removeTicketParticipant(req.params.id, req.params.accountId, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data, message: 'User removed from the ticket' });
  } catch (err) {
    console.error('Error removing ticket participant:', err);
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Failed to remove user',
    });
  }
}

async function postTicketTranscript(req, res) {
  try {
    const data = await generateTicketTranscript(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data, message: 'Transcript saved' });
  } catch (err) {
    console.error('Error generating ticket transcript:', err);
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Failed to generate transcript',
    });
  }
}

async function postTicketScheduleClose(req, res) {
  try {
    const data = await scheduleTicketClose(req.params.id, req.session, req.body?.closesAt);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data, message: 'Close time saved' });
  } catch (err) {
    console.error('Error scheduling ticket close:', err);
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.statusCode ? err.message : 'Failed to schedule the close',
    });
  }
}

async function deleteTicketScheduleClose(req, res) {
  try {
    const data = await cancelScheduledTicketClose(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data, message: 'Scheduled close cancelled' });
  } catch (err) {
    console.error('Error cancelling scheduled ticket close:', err);
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.statusCode ? err.message : 'Failed to cancel the scheduled close',
    });
  }
}

async function postMyTicketInvite(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) return res.status(401).json({ success: false, message: 'Authentication required' });
    const data = await respondTicketInvite(req.params.id, accountId, req.body?.action);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error responding to ticket invite:', err);
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Failed to respond to the invite',
    });
  }
}

async function postMyTicketSatisfaction(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) return res.status(401).json({ success: false, message: 'Authentication required' });
    const data = await submitTicketSatisfaction(req.params.id, accountId, req.body?.score, req.body?.comment);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to save rating' });
  }
}

module.exports = {
  getAdminTicketsOverview,
  getAdminTicketDetail,
  createAdminTicket,
  createStaffTicket,
  patchAdminTicket,
  postAdminTicketMessage,
  patchAdminTicketMessage,
  deleteAdminTicketMessage,
  getAdminDisputeDetail,
  patchAdminDispute,
  postAdminDisputeMessage,
  patchAdminDisputeMessage,
  getAdminReportDetail,
  patchAdminReport,
  getPublicTicketCatalog,
  getTicketContext,
  createPublicTicket,
  listMyTickets,
  listMyDisputes,
  getMyDispute,
  getMyTicket,
  postMyTicketMessage,
  postMyTicketInvite,
  createMyTechnicalReport,
  getAdminTicketArticles,
  postAdminTicketArticle,
  deleteAdminTicketArticle,
  postTicketCreditAdjustment,
  getTicketParticipantSearch,
  postTicketParticipant,
  deleteTicketParticipant,
  postTicketTranscript,
  postTicketScheduleClose,
  postTicketAppealDecision,
  deleteTicketScheduleClose,
  postMyTicketSatisfaction,
};
