const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireStaffRole = require('../middleware/requireStaffRole');
const {
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
} = require('../Controllers/MarketplaceModeratorControllers');

const marketplaceModerator = requireStaffRole(['Marketplace Moderator']);

router.get('/marketplace/overview', [checkSession, marketplaceModerator], getOverview);
router.get('/marketplace/listings', [checkSession, marketplaceModerator], getListings);
router.get('/marketplace/listings/:id', [checkSession, marketplaceModerator], getListingDetail);
router.patch('/marketplace/listings/:id', [checkSession, marketplaceModerator], patchListing);
router.get('/marketplace/tickets', [checkSession, marketplaceModerator], getTickets);

router.get('/tickets/:id', [checkSession, marketplaceModerator], getTicket);
router.patch('/tickets/:id', [checkSession, marketplaceModerator], patchTicket);
router.post('/tickets/:id/messages', [checkSession, marketplaceModerator], postTicketMessage);

router.get('/restrictions', [checkSession, marketplaceModerator], getRestrictions);
router.post('/restrictions/violations', [checkSession, marketplaceModerator], postViolation);
router.patch('/restrictions/accounts/:id', [checkSession, marketplaceModerator], patchRestriction);

module.exports = router;
