const {
  getMarketplaceOverview,
  getMarketplaceListings,
  getMarketplaceListingDetail,
  reviewMarketplaceListing,
  getMarketplaceTickets,
} = require('../Repositories/MarketplaceModeratorRepositories');
const {
  getTicketDetail,
  updateTicket,
  addTicketMessage,
} = require('../Repositories/AdminTicketsRepositories');
const {
  getViolationsAndRestrictions,
  issueViolation,
  updateAccountRestriction,
} = require('../Repositories/ModeratorRepositories');

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
    const data = await getMarketplaceListings({ status: req.query.status });
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
    const data = await getTicketDetail(req.params.id);
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
      err?.message?.includes('not valid for') || err?.message?.includes('type is required')
        ? err.message
        : 'Failed to update ticket';
    res
      .status(
        err?.message?.includes('not valid for') || err?.message?.includes('type is required')
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

module.exports = {
  getOverview,
  getListings,
  getListingDetail,
  patchListing,
  getTickets,
  getTicket,
  patchTicket,
  postTicketMessage,
  getRestrictions,
  postViolation,
  patchRestriction,
};
