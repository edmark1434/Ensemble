const {
  getMarketplaceOverview,
  getMarketplaceListings,
  getMarketplaceListingDetail,
  getSellerMarketplaceListings,
  reviewMarketplaceListing,
  getMarketplaceTickets,
  getMarketplaceReports,
} = require('../repositories/MarketplaceModeratorRepositories');
const { getListingOriginalAccess } = require('../services/MarketplaceListingFileServices');
const {
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  getReportDetail,
  updateReport,
} = require('../repositories/AdminTicketsRepositories');
const { MARKETPLACE_REPORT_TYPES, isReportTypeInScope } = require('../lib/ReportEnums');
const { ticketInStaffQueue } = require('../lib/TicketQueueScope');

/**
 * The marketplace desk may only read or act on tickets filed under a marketplace type that
 * Admin has not taken over (escalated to Admin, or handled by an Admin) — the same rule the
 * queue list applies.
 */
function isMarketplaceTicket(ticket) {
  return ticketInStaffQueue('Marketplace Moderator', {
    type: ticket?.type || ticket?.category,
    escalatedToRole: ticket?.escalatedToRole,
    handlerRole: ticket?.assignee?.role,
  });
}

async function loadScopedTicket(req, res) {
  const detail = await getTicketDetail(req.params.id, req.session, { assignableQueue: 'marketplace' });
  if (!detail) {
    res.status(404).json({ success: false, message: 'Ticket not found' });
    return null;
  }
  if (!isMarketplaceTicket(detail.ticket)) {
    res.status(403).json({ success: false, message: 'Ticket is outside the marketplace queue' });
    return null;
  }
  return detail;
}

/**
 * Route guard for the shared message edit/delete handlers, so a marketplace moderator cannot
 * reach a message on a ticket outside this queue by guessing its id.
 */
async function requireMarketplaceTicket(req, res, next) {
  try {
    if (await loadScopedTicket(req, res)) next();
  } catch (err) {
    console.error('Error checking marketplace ticket scope:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

/** Caller mistakes from `updateTicket` (bad move target, missing type, no permission). */
function ticketUpdateClientStatus(message) {
  const msg = String(message || '');
  if (/only a moderator or admin|only the assigned|assign yourself|permission/i.test(msg)) return 403;
  if (
    /not valid for|type is required|only be changed when escalating|unknown escalate role|unknown ticket action|invalid|already has a handler|use assign myself|already filed|another desk|pick a ticket|open this ticket/i.test(
      msg
    )
  ) {
    return 400;
  }
  return null;
}

async function getOverview(req, res) {
  try {
    const data = await getMarketplaceOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching marketplace overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load marketplace overview' });
  }
}

async function getListings(req, res) {
  try {
    const data = await getMarketplaceListings({
      status: req.query.status,
      search: req.query.search,
      category: req.query.category,
      sort: req.query.sort,
      limit: req.query.limit,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching marketplace listings:', err);
    res.status(500).json({ success: false, message: 'Failed to load listings' });
  }
}

/** Listing and account ids are UUIDs; anything else is a missing record, not a server fault. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_PATTERN.test(String(value || ''));
}

async function getListingDetail(req, res) {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    const data = await getMarketplaceListingDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Listing not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching listing detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load listing' });
  }
}

async function getSellerListings(req, res) {
  try {
    if (!isUuid(req.params.accountId)) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    const data = await getSellerMarketplaceListings(req.params.accountId);
    if (!data) return res.status(404).json({ success: false, message: 'Account not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching seller listings:', err);
    res.status(500).json({ success: false, message: 'Failed to load seller listings' });
  }
}

/** Signed link to one original upload on a listing (`?download=1` for an attachment). */
async function getListingFileOriginal(req, res) {
  try {
    const download = ['1', 'true', 'yes'].includes(String(req.query.download || '').toLowerCase());
    const data = await getListingOriginalAccess(
      req.params.id,
      req.params.mediaAssetId,
      { download },
      req.session
    );
    res.set('Cache-Control', 'private, no-store');
    res.status(200).json({ success: true, data });
  } catch (err) {
    const status = err?.statusCode || 500;
    if (status >= 500) console.error('Error preparing listing file access:', err);
    res.status(status).json({
      success: false,
      message: status < 500 ? err.message : 'Failed to open the original file',
    });
  }
}

async function patchListing(req, res) {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    const data = await reviewMarketplaceListing(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Listing not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err?.message || 'Failed to update listing';
    // "Listing not found" and "Invalid listing status" are caller errors, not faults.
    const status = err?.statusCode || (/not found/i.test(message) ? 404 : /invalid/i.test(message) ? 400 : 500);
    if (status >= 500) console.error('Error updating listing:', err);
    res
      .status(status)
      .json({ success: false, message: status < 500 ? message : 'Failed to update listing' });
  }
}

async function getTickets(req, res) {
  try {
    const data = await getMarketplaceTickets({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching marketplace tickets:', err);
    res.status(500).json({ success: false, message: 'Failed to load tickets' });
  }
}

async function getTicket(req, res) {
  try {
    const data = await loadScopedTicket(req, res);
    if (!data) return;
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

/**
 * Update a marketplace ticket. `{ action: 'recategorize', type }` corrects the category inside
 * this desk; `assigned_role` + `type` sends it to another desk or escalates it to Admin, after
 * which it leaves this queue.
 */
async function patchTicket(req, res) {
  try {
    if (!(await loadScopedTicket(req, res))) return;
    const data = await updateTicket(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    const status = err?.statusCode || ticketUpdateClientStatus(err?.message) || 500;
    if (status >= 500) console.error('Error updating ticket:', err);
    res
      .status(status)
      .json({ success: false, message: status < 500 ? err.message : 'Failed to update ticket' });
  }
}

async function postTicketMessage(req, res) {
  try {
    if (!(await loadScopedTicket(req, res))) return;
    const { body, isInternal, attachments } = req.body;
    if (!body?.trim() && !(Array.isArray(attachments) && attachments.length)) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
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
    const data = await getMarketplaceReports({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching marketplace reports:', err);
    res.status(500).json({ success: false, message: 'Failed to load reports' });
  }
}

async function getReport(req, res) {
  try {
    const data = await getReportDetail(req.params.id, req.session, { assignableQueue: 'marketplace' });
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!isReportTypeInScope(data.report?.targetType, MARKETPLACE_REPORT_TYPES)) {
      return res.status(403).json({ success: false, message: 'Report is outside the marketplace queue' });
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching marketplace report detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load report' });
  }
}

async function patchReport(req, res) {
  try {
    const existing = await getReportDetail(req.params.id, req.session, { assignableQueue: 'marketplace' });
    if (!existing) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!isReportTypeInScope(existing.report?.targetType, MARKETPLACE_REPORT_TYPES)) {
      return res.status(403).json({ success: false, message: 'Report is outside the marketplace queue' });
    }
    const data = await updateReport(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating marketplace report:', err);
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
    const { fetchScopedDisputes } = require('../repositories/ModeratorSharedRepositories');
    const data = await fetchScopedDisputes({ status: req.query.status });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching marketplace disputes:', err);
    res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
}

async function getDispute(req, res) {
  try {
    const { getDisputeDetail } = require('../repositories/AdminTicketsRepositories');
    const data = await getDisputeDetail(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching marketplace dispute detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load dispute' });
  }
}

async function patchDispute(req, res) {
  try {
    const { updateDispute } = require('../repositories/AdminTicketsRepositories');
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
    const { addDisputeMessage } = require('../repositories/AdminTicketsRepositories');
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
    const isClient = /permission|assign yourself|view only|could not match/i.test(msg);
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
  }
}

async function patchDisputeMessage(req, res) {
  try {
    const { setDisputeMessageAudience } = require('../repositories/AdminTicketsRepositories');
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
    const isClient = /assign yourself|invalid|not found|permission/i.test(msg);
    res.status(isClient ? 400 : 500).json({ success: false, message: msg });
  }
}

module.exports = {
  requireMarketplaceTicket,
  getOverview,
  getListings,
  getListingDetail,
  getSellerListings,
  patchListing,
  getListingFileOriginal,
  getTickets,
  getTicket,
  patchTicket,
  postTicketMessage,
  getReports,
  getReport,
  patchReport,
  getDisputes,
  getDispute,
  patchDispute,
  postDisputeMessage,
  patchDisputeMessage,
};
