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
const { lookupRestrictionAccounts } = require('../controllers/RestrictionDeskControllers');
const {
  patchAdminTicketMessage,
  deleteAdminTicketMessage,
} = require('../controllers/AdminTicketsControllers');

const marketplaceModerator = requireStaffRole(['Marketplace Moderator']);
const supportModerator = requireStaffRole(['Support Moderator']);
const forumModerator = requireStaffRole(['Forum Moderator']);
const jobsModerator = requireStaffRole(['Jobs N Gigs Moderator']);
const restrictionDeskStaff = requireStaffRole([
  'Admin',
  'Support Moderator',
  'Forum Moderator',
  'Marketplace Moderator',
  'Jobs N Gigs Moderator',
]);
const { getWarningCatalog } = require('../controllers/WarningDefControllers');
const { getPunishmentCatalog } = require('../controllers/PunishmentDefControllers');

router.get('/warning-catalog', [checkSession, restrictionDeskStaff], getWarningCatalog);
router.get('/punishment-catalog', [checkSession, restrictionDeskStaff], getPunishmentCatalog);

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
router.patch('/marketplace/tickets/:id/messages/:messageId', [checkSession, marketplaceModerator], patchAdminTicketMessage);
router.delete('/marketplace/tickets/:id/messages/:messageId', [checkSession, marketplaceModerator], deleteAdminTicketMessage);
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
router.patch('/tickets/:id/messages/:messageId', [checkSession, marketplaceModerator], patchAdminTicketMessage);
router.delete('/tickets/:id/messages/:messageId', [checkSession, marketplaceModerator], deleteAdminTicketMessage);

// Marketplace moderation enforcement happens inside a report case, so this console has no
// standalone restrictions desk. The other consoles keep their `/<desk>/restrictions` routes.

// ─── Support Moderator ───────────────────────────────────────────────────
router.get('/support/overview', [checkSession, supportModerator], SupportModerator.getOverview);
router.get('/support/tickets', [checkSession, supportModerator], SupportModerator.getTickets);
router.get('/support/tickets/:id', [checkSession, supportModerator], SupportModerator.getTicket);
router.patch('/support/tickets/:id', [checkSession, supportModerator], SupportModerator.patchTicket);
router.post('/support/tickets/:id/messages', [checkSession, supportModerator], SupportModerator.postTicketMessage);
router.patch('/support/tickets/:id/messages/:messageId', [checkSession, supportModerator], SupportModerator.patchTicketMessage);
router.delete('/support/tickets/:id/messages/:messageId', [checkSession, supportModerator], SupportModerator.deleteTicketMessage);
router.post('/support/tickets/:id/credit-adjustment', [checkSession, supportModerator], SupportModerator.postTicketCreditAdjustment);
router.get('/support/reports', [checkSession, supportModerator], SupportModerator.getReports);
router.get('/support/reports/:id', [checkSession, supportModerator], SupportModerator.getReport);
router.patch('/support/reports/:id', [checkSession, supportModerator], SupportModerator.patchReport);
router.get('/support/disputes', [checkSession, supportModerator], SupportModerator.getDisputes);
router.get('/support/disputes/:id', [checkSession, supportModerator], SupportModerator.getDispute);
router.post('/support/disputes/:id/financial-resolution', [checkSession, supportModerator], SupportModerator.postFinancialResolution);
router.patch('/support/disputes/:id', [checkSession, supportModerator], SupportModerator.patchDispute);
router.post('/support/disputes/:id/messages', [checkSession, supportModerator], SupportModerator.postDisputeMessage);
router.patch('/support/disputes/:id/messages/:messageId', [checkSession, supportModerator], SupportModerator.patchDisputeMessage);

// Support enforcement happens inside a report case and in User & Team → Users, so this console
// has no standalone restrictions desk. The forum and jobs consoles keep theirs.

// ─── Forum Moderator ─────────────────────────────────────────────────────
router.get('/forum/overview', [checkSession, forumModerator], ForumModerator.getOverview);
router.get('/forum/tickets', [checkSession, forumModerator], ForumModerator.getTickets);
router.get('/forum/tickets/:id', [checkSession, forumModerator], ForumModerator.getTicket);
router.patch('/forum/tickets/:id', [checkSession, forumModerator], ForumModerator.patchTicket);
router.post('/forum/tickets/:id/messages', [checkSession, forumModerator], ForumModerator.postTicketMessage);
router.patch('/forum/tickets/:id/messages/:messageId', [checkSession, forumModerator], patchAdminTicketMessage);
router.delete('/forum/tickets/:id/messages/:messageId', [checkSession, forumModerator], deleteAdminTicketMessage);
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
router.get('/forum/groups/:id', [checkSession, forumModerator], ForumModerator.getGroup);
router.patch('/forum/groups/:id', [checkSession, forumModerator], ForumModerator.patchGroup);
router.patch('/forum/groups/:id/members/:memberId', [checkSession, forumModerator], ForumModerator.patchGroupMember);
router.get('/forum/discussions', [checkSession, forumModerator], ForumModerator.getDiscussions);
router.get('/forum/discussions/:id', [checkSession, forumModerator], ForumModerator.getDiscussion);
router.patch('/forum/discussions/:id', [checkSession, forumModerator], ForumModerator.patchDiscussion);
router.delete('/forum/discussions/:id/comments/:commentId', [checkSession, forumModerator], ForumModerator.deleteComment);
router.get('/forum/restrictions', [checkSession, forumModerator], ForumModerator.getRestrictions);
router.get('/forum/restrictions/lookup', [checkSession, forumModerator], lookupRestrictionAccounts);
router.post('/forum/restrictions/violations', [checkSession, forumModerator], ForumModerator.postViolation);
router.patch('/forum/restrictions/accounts/:id', [checkSession, forumModerator], ForumModerator.patchRestriction);

// ─── Jobs & Gigs Moderator ───────────────────────────────────────────────
router.get('/jobs/overview', [checkSession, jobsModerator], JobsModerator.getOverview);
router.get('/jobs/tickets', [checkSession, jobsModerator], JobsModerator.getTickets);
router.get('/jobs/tickets/:id', [checkSession, jobsModerator], JobsModerator.getTicket);
router.patch('/jobs/tickets/:id', [checkSession, jobsModerator], JobsModerator.patchTicket);
router.post('/jobs/tickets/:id/messages', [checkSession, jobsModerator], JobsModerator.postTicketMessage);
router.patch(
  '/jobs/tickets/:id/messages/:messageId',
  [checkSession, jobsModerator, JobsModerator.requireJobsTicket],
  patchAdminTicketMessage
);
router.delete(
  '/jobs/tickets/:id/messages/:messageId',
  [checkSession, jobsModerator, JobsModerator.requireJobsTicket],
  deleteAdminTicketMessage
);
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

// Jobs & Gigs enforcement is taken inside a report case (or from User & Team → Users), so
// this console has no standalone restrictions desk. Forum still keeps its own.

module.exports = router;
