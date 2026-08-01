const {
  getMarketplaceOverview,
  getMarketplaceListings,
  getMarketplaceListingDetail,
  getSellerMarketplaceListings,
  reviewMarketplaceListing,
  getMarketplaceTickets,
  getMarketplaceReports,
} = require('../Repositories/MarketplaceModeratorRepositories');
const {
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  getReportDetail,
  updateReport,
} = require('../Repositories/AdminTicketsRepositories');
const {
  getViolationsAndRestrictions,
  issueViolation,
  updateAccountRestriction,
} = require('../Repositories/ModeratorRepositories');
const { MARKETPLACE_REPORT_TYPES, isReportTypeInScope } = require('../lib/reportEnums');

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
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching marketplace listings:', err);
    res.status(500).json({ success: false, message: 'Failed to load listings' });
  }
}

async function getListingDetail(req, res) {
  try {
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
    const data = await getSellerMarketplaceListings(req.params.accountId);
    if (!data) return res.status(404).json({ success: false, message: 'Account not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching seller listings:', err);
    res.status(500).json({ success: false, message: 'Failed to load seller listings' });
  }
}

async function patchListing(req, res) {
  try {
    const data = await reviewMarketplaceListing(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Listing not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating listing:', err);
    res.status(500).json({ success: false, message: 'Failed to update listing' });
  }
}

async function getTickets(req, res) {
  try {
    const data = await getMarketplaceTickets();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching marketplace tickets:', err);
    res.status(500).json({ success: false, message: 'Failed to load tickets' });
  }
}

async function getTicket(req, res) {
  try {
    const data = await getTicketDetail(req.params.id, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load ticket' });
  }
}

async function patchTicket(req, res) {
  try {
    const data = await updateTicket(req.params.id, req.body, req.session);
    if (!data) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating ticket:', err);
    const msg =
      err?.message?.includes('not valid for') || err?.message?.includes('type is required') ||
        err?.message?.includes('only be changed when escalating')
        ? err.message
        : 'Failed to update ticket';
    res
      .status(
        err?.message?.includes('not valid for') || err?.message?.includes('type is required') ||
        err?.message?.includes('only be changed when escalating')
          ? 400
          : 500
      )
      .json({ success: false, message: msg });
  }
}

async function postTicketMessage(req, res) {
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
    const { accountId, title, reason, points } = req.body;
    if (!accountId || !title) {
      return res.status(400).json({ success: false, message: 'accountId and title are required' });
    }
    const data = await issueViolation(accountId, { title, reason, points }, req.session);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error issuing violation:', err);
    res.status(500).json({ success: false, message: 'Failed to issue violation' });
  }
}

async function patchRestriction(req, res) {
  try {
    const data = await updateAccountRestriction(req.params.id, req.body.status);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating account restriction:', err);
    res.status(500).json({ success: false, message: 'Failed to update restriction' });
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
    const data = await getReportDetail(req.params.id);
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
    const existing = await getReportDetail(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!isReportTypeInScope(existing.report?.targetType, MARKETPLACE_REPORT_TYPES)) {
      return res.status(403).json({ success: false, message: 'Report is outside the marketplace queue' });
    }
    const data = await updateReport(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating marketplace report:', err);
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
}

module.exports = {
  getOverview,
  getListings,
  getListingDetail,
  getSellerListings,
  patchListing,
  getTickets,
  getTicket,
  patchTicket,
  postTicketMessage,
  getRestrictions,
  postViolation,
  patchRestriction,
  getReports,
  getReport,
  patchReport,
};
