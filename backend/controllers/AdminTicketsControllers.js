const {
  getTicketsOverview,
  getTicketDetail,
  getTicketQueueFacts,
  searchTicketParticipants,
  addTicketParticipant,
  removeTicketParticipant,
  respondTicketInvite,
  generateTicketTranscript,
  decideTicketAppeal,
  scheduleTicketClose,
  cancelScheduledTicketClose,
  getTicketPickers,
  searchTicketTeams,
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
const {
  listMemberTickets,
  getMemberTicket,
  listMemberDisputes,
  getMemberDispute,
  getCaseSummary,
} = require('../services/CaseServices');
const { createReport } = require('../repositories/ModeratorSharedRepositories');
const { createReportNumber, buildSubjectSnapshot } = require('../lib/ReportSubject');
const { createStaffTicketService, createMemberTicket } = require('../services/TicketServices');
const { applyFinancialResolution } = require('../services/DisputeFinancialServices');
const { ticketInStaffQueue } = require('../lib/TicketQueueScope');

/**
 * Guard for the shared `/api/staff/tickets/:id/*` routes: a specialist moderator may only
 * transcribe, schedule, invite on or decide tickets that are in their own desk's queue.
 */
async function requireTicketInStaffQueue(req, res, next) {
  try {
    const facts = await getTicketQueueFacts(req.params.id);
    if (!facts) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (!ticketInStaffQueue(req.session?.role, facts)) {
      return res.status(403).json({ success: false, message: 'Ticket is outside your queue' });
    }
    return next();
  } catch (err) {
    console.error('Error checking ticket queue scope:', err);
    return res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

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
    const data = await getTicketDetail(req.params.id, req.session, { includeCase: req.query?.include === 'case' });
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

async function postAdminDisputeFinancialResolution(req, res) {
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

async function postAdminDisputeMessage(req, res) {
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
    const isClient = Number(err?.statusCode) === 400 || /assign yourself|view only|could not match/i.test(msg);
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
    const isClient = Number(err?.statusCode) === 400 || /assign yourself|invalid|not found/i.test(msg);
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
    const data = await getReportDetail(req.params.id, req.session, { includeAccountContext: true });
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

async function getTicketTeamSearch(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const data = await searchTicketTeams(accountId, req.query?.q);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status >= 500) console.error('Error searching ticket teams:', err);
    res.status(status).json({
      success: false,
      message: status < 500 ? err.message : 'Failed to search teams',
    });
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

/** Member ticket intake; the rules live in `TicketServices.createMemberTicket`. */
async function createPublicTicket(req, res) {
  try {
    const data = await createMemberTicket({
      session: req.session,
      accountAccess: req.accountAccess,
      body: req.body,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    // Only messages written for the member go back; database errors stay in the log.
    if (status >= 500) console.error('Error creating member ticket:', err);
    res.status(status).json({
      success: false,
      ...(status < 500 && typeof err.code === 'string' ? { code: err.code } : {}),
      ...(status < 500 && err.data ? { data: err.data } : {}),
      message: status < 500 ? err.message : 'Failed to create the ticket. Please try again.',
    });
  }
}

async function postTicketAppealDecision(req, res) {
  try {
    // Body: { decision, remedy?, endsAt?, note?, followUp? } — see decideTicketAppeal.
    const data = await decideTicketAppeal(req.params.id, req.body?.decision, req.session, req.body || {});
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const decision = data.appealDecision;
    const summary = data.appealOutcomeSummary || {};
    const lifted = {
      ended_now: 'The penalty is lifted now.',
      ends_soon: 'The penalty ends within 24 hours.',
      shortened: 'The penalty now ends on the date you chose.',
      rescinded: 'The warning is rescinded.',
      ended: 'The penalty had already ended, so nothing changed.',
      changed: 'The penalty had been replaced by a newer one, so nothing changed.',
    }[summary.outcome] || 'The penalty ends in 24 hours.';
    const followUp = summary.followUp
      ? summary.followUp.applied
        ? ` The ${summary.followUp.action === 'ban' ? 'ban' : 'suspension'} was issued.`
        : ` The ${summary.followUp.action === 'ban' ? 'ban' : 'suspension'} could not be issued: ${summary.followUp.error || 'unknown error'}. Issue it from User & Team.`
      : '';
    const message = decision === 'accepted'
      ? `Appeal accepted. ${lifted} The ticket is closed.`
      : decision === 'denied_permanent'
        ? `Appeal denied permanently. The ticket is closed.${followUp}`
        : `Appeal denied. The ticket is closed.${followUp}`;
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
    const data = await listMemberTickets(accountId, req.accountAccess);
    res.status(200).json({ success: true, data });
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
    const data = await listMemberDisputes(accountId, req.accountAccess);
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
    const data = await getMemberDispute(req.params.id, accountId, req.accountAccess);
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
    const result = await getMemberTicket(req.params.id, accountId, req.accountAccess);
    if (result.status !== 200) {
      return res.status(result.status).json({ success: false, message: result.message });
    }
    res.status(200).json({ success: true, data: result.data });
  } catch (err) {
    console.error('Error fetching user ticket:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

/** Open cases and what needs the member: the case bar and the sidebar badge. */
async function getMyCaseSummary(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const data = await getCaseSummary(accountId, req.accountAccess);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error loading case summary:', err);
    res.status(500).json({ success: false, message: 'Failed to load your cases' });
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
    const { APPEAL_TICKET_TYPE, appealTicketsOnly } = require('../lib/AccountRestriction');
    if (appealTicketsOnly(req.accountAccess) && existing.ticket?.type !== APPEAL_TICKET_TYPE) {
      return res.status(403).json({
        success: false,
        code: req.accountAccess.code || 'ACCOUNT_BANNED',
        message: 'While this penalty is active you can only reply on your appeal ticket.',
      });
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
  requireTicketInStaffQueue,
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
  postAdminDisputeFinancialResolution,
  postAdminDisputeMessage,
  patchAdminDisputeMessage,
  getAdminReportDetail,
  patchAdminReport,
  getPublicTicketCatalog,
  getTicketContext,
  getTicketTeamSearch,
  createPublicTicket,
  listMyTickets,
  listMyDisputes,
  getMyDispute,
  getMyTicket,
  getMyCaseSummary,
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
