const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireStaffRole = require('../middleware/RequireStaffRole');
const {
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
  getReports: getMarketplaceReports,
  getReport: getMarketplaceReport,
  patchReport: patchMarketplaceReport,
  getDisputes: getMarketplaceDisputes,
  getDispute: getMarketplaceDispute,
  patchDispute: patchMarketplaceDispute,
  postDisputeMessage: postMarketplaceDisputeMessage,
  patchDisputeMessage: patchMarketplaceDisputeMessage,
} = require('../controllers/MarketplaceModeratorControllers');
const SupportModerator = require('../controllers/SupportModeratorControllers');
const ForumModerator = require('../controllers/ForumModeratorControllers');
const JobsModerator = require('../controllers/JobsModeratorControllers');

const marketplaceModerator = requireStaffRole(['Marketplace Moderator']);
const supportModerator = requireStaffRole(['Support Moderator']);
const forumModerator = requireStaffRole(['Forum Moderator']);
const jobsModerator = requireStaffRole(['Jobs N Gigs Moderator']);

// ─── Marketplace Moderator ───────────────────────────────────────────────
router.get('/marketplace/overview', [checkSession, marketplaceModerator], getOverview);
router.get('/marketplace/listings', [checkSession, marketplaceModerator], getListings);
router.get('/marketplace/listings/:id', [checkSession, marketplaceModerator], getListingDetail);
router.patch('/marketplace/listings/:id', [checkSession, marketplaceModerator], patchListing);
router.get('/marketplace/users/:accountId/listings', [checkSession, marketplaceModerator], getSellerListings);
router.get('/marketplace/tickets', [checkSession, marketplaceModerator], getTickets);
router.get('/marketplace/tickets/:id', [checkSession, marketplaceModerator], getTicket);
router.patch('/marketplace/tickets/:id', [checkSession, marketplaceModerator], patchTicket);
router.post('/marketplace/tickets/:id/messages', [checkSession, marketplaceModerator], postTicketMessage);
router.get('/marketplace/reports', [checkSession, marketplaceModerator], getMarketplaceReports);
router.get('/marketplace/reports/:id', [checkSession, marketplaceModerator], getMarketplaceReport);
router.patch('/marketplace/reports/:id', [checkSession, marketplaceModerator], patchMarketplaceReport);
router.get('/marketplace/disputes', [checkSession, marketplaceModerator], getMarketplaceDisputes);
router.get('/marketplace/disputes/:id', [checkSession, marketplaceModerator], getMarketplaceDispute);
router.patch('/marketplace/disputes/:id', [checkSession, marketplaceModerator], patchMarketplaceDispute);
router.post(
  '/marketplace/disputes/:id/messages',
  [checkSession, marketplaceModerator],
  postMarketplaceDisputeMessage
);
router.patch(
  '/marketplace/disputes/:id/messages/:messageId',
  [checkSession, marketplaceModerator],
  patchMarketplaceDisputeMessage
);

router.get('/tickets/:id', [checkSession, marketplaceModerator], getTicket);
router.patch('/tickets/:id', [checkSession, marketplaceModerator], patchTicket);
router.post('/tickets/:id/messages', [checkSession, marketplaceModerator], postTicketMessage);

router.get('/restrictions', [checkSession, marketplaceModerator], getRestrictions);
router.post('/restrictions/violations', [checkSession, marketplaceModerator], postViolation);
router.patch('/restrictions/accounts/:id', [checkSession, marketplaceModerator], patchRestriction);

// ─── Support Moderator ───────────────────────────────────────────────────
router.get('/support/overview', [checkSession, supportModerator], SupportModerator.getOverview);
router.get('/support/tickets', [checkSession, supportModerator], SupportModerator.getTickets);
router.get('/support/tickets/:id', [checkSession, supportModerator], SupportModerator.getTicket);
router.patch('/support/tickets/:id', [checkSession, supportModerator], SupportModerator.patchTicket);
router.post('/support/tickets/:id/messages', [checkSession, supportModerator], SupportModerator.postTicketMessage);
router.get('/support/reports', [checkSession, supportModerator], SupportModerator.getReports);
router.get('/support/reports/:id', [checkSession, supportModerator], SupportModerator.getReport);
router.patch('/support/reports/:id', [checkSession, supportModerator], SupportModerator.patchReport);
router.get('/support/disputes', [checkSession, supportModerator], SupportModerator.getDisputes);
router.get('/support/disputes/:id', [checkSession, supportModerator], SupportModerator.getDispute);
router.patch('/support/disputes/:id', [checkSession, supportModerator], SupportModerator.patchDispute);
router.post('/support/disputes/:id/messages', [checkSession, supportModerator], SupportModerator.postDisputeMessage);
router.patch('/support/disputes/:id/messages/:messageId', [checkSession, supportModerator], SupportModerator.patchDisputeMessage);
router.get('/support/restrictions', [checkSession, supportModerator], SupportModerator.getRestrictions);
router.post('/support/restrictions/violations', [checkSession, supportModerator], SupportModerator.postViolation);
router.patch('/support/restrictions/accounts/:id', [checkSession, supportModerator], SupportModerator.patchRestriction);

// ─── Forum Moderator ─────────────────────────────────────────────────────
router.get('/forum/overview', [checkSession, forumModerator], ForumModerator.getOverview);
router.get('/forum/tickets', [checkSession, forumModerator], ForumModerator.getTickets);
router.get('/forum/tickets/:id', [checkSession, forumModerator], ForumModerator.getTicket);
router.patch('/forum/tickets/:id', [checkSession, forumModerator], ForumModerator.patchTicket);
router.post('/forum/tickets/:id/messages', [checkSession, forumModerator], ForumModerator.postTicketMessage);
router.get('/forum/reports', [checkSession, forumModerator], ForumModerator.getReports);
router.get('/forum/reports/:id', [checkSession, forumModerator], ForumModerator.getReport);
router.patch('/forum/reports/:id', [checkSession, forumModerator], ForumModerator.patchReport);
router.get('/forum/disputes', [checkSession, forumModerator], ForumModerator.getDisputes);
router.get('/forum/disputes/:id', [checkSession, forumModerator], ForumModerator.getDispute);
router.patch('/forum/disputes/:id', [checkSession, forumModerator], ForumModerator.patchDispute);
router.post('/forum/disputes/:id/messages', [checkSession, forumModerator], ForumModerator.postDisputeMessage);
router.patch(
  '/forum/disputes/:id/messages/:messageId',
  [checkSession, forumModerator],
  ForumModerator.patchDisputeMessage
);
router.get('/forum/groups', [checkSession, forumModerator], ForumModerator.getGroups);
router.patch('/forum/groups/:id', [checkSession, forumModerator], ForumModerator.patchGroup);
router.patch('/forum/groups/:id/members/:memberId', [checkSession, forumModerator], ForumModerator.patchGroupMember);
router.get('/forum/discussions', [checkSession, forumModerator], ForumModerator.getDiscussions);
router.get('/forum/discussions/:id', [checkSession, forumModerator], ForumModerator.getDiscussion);
router.patch('/forum/discussions/:id', [checkSession, forumModerator], ForumModerator.patchDiscussion);
router.delete('/forum/discussions/:id/comments/:commentId', [checkSession, forumModerator], ForumModerator.deleteComment);
router.get('/forum/restrictions', [checkSession, forumModerator], ForumModerator.getRestrictions);
router.post('/forum/restrictions/violations', [checkSession, forumModerator], ForumModerator.postViolation);
router.patch('/forum/restrictions/accounts/:id', [checkSession, forumModerator], ForumModerator.patchRestriction);

// ─── Jobs & Gigs Moderator ───────────────────────────────────────────────
router.get('/jobs/overview', [checkSession, jobsModerator], JobsModerator.getOverview);
router.get('/jobs/tickets', [checkSession, jobsModerator], JobsModerator.getTickets);
router.get('/jobs/tickets/:id', [checkSession, jobsModerator], JobsModerator.getTicket);
router.patch('/jobs/tickets/:id', [checkSession, jobsModerator], JobsModerator.patchTicket);
router.post('/jobs/tickets/:id/messages', [checkSession, jobsModerator], JobsModerator.postTicketMessage);
router.get('/jobs/reports', [checkSession, jobsModerator], JobsModerator.getReports);
router.get('/jobs/reports/:id', [checkSession, jobsModerator], JobsModerator.getReport);
router.patch('/jobs/reports/:id', [checkSession, jobsModerator], JobsModerator.patchReport);
router.get('/jobs/disputes', [checkSession, jobsModerator], JobsModerator.getDisputes);
router.get('/jobs/disputes/:id', [checkSession, jobsModerator], JobsModerator.getDispute);
router.patch('/jobs/disputes/:id', [checkSession, jobsModerator], JobsModerator.patchDispute);
router.post('/jobs/disputes/:id/messages', [checkSession, jobsModerator], JobsModerator.postDisputeMessage);
router.patch(
  '/jobs/disputes/:id/messages/:messageId',
  [checkSession, jobsModerator],
  JobsModerator.patchDisputeMessage
);
router.get('/jobs/postings', [checkSession, jobsModerator], JobsModerator.getPostings);
router.get('/jobs/postings/:type/:id', [checkSession, jobsModerator], JobsModerator.getPosting);
router.patch('/jobs/postings/:type/:id', [checkSession, jobsModerator], JobsModerator.patchPosting);
router.get('/jobs/users/:accountId/history', [checkSession, jobsModerator], JobsModerator.getUserHistory);
router.get('/jobs/restrictions', [checkSession, jobsModerator], JobsModerator.getRestrictions);
router.post('/jobs/restrictions/violations', [checkSession, jobsModerator], JobsModerator.postViolation);
router.patch('/jobs/restrictions/accounts/:id', [checkSession, jobsModerator], JobsModerator.patchRestriction);

module.exports = router;
