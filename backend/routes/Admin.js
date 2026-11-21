const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAdmin = require('../middleware/RequireAdmin');
const requireStaffRole = require('../middleware/RequireStaffRole');
const { getAdminDashboardOverview } = require('../controllers/AdminControllers');
const {
  getAdminTeamsManagement,
  getAdminUsersManagement,
  getAdminUserVerificationDetails,
  getAdminUserTeamOverview,
  patchAdminAccountStatus,
  patchAdminAccountVerification,
  approveAdminAccountVerification,
  declineAdminAccountVerification,
  resubmitAdminAccountVerification,
  postAdminAccountCreditAdjust,
  postAdminAccountCreditFreeze,
  postAdminAccountWarn,
  postAdminRescindWarning,
  getAdminWarningLiftPreview,
  postAdminLiftWarningPoints,
  getAdminAccountMeritPenalties,
  postAdminEndMeritPenalty,
  postAdminUnfreezeAccount,
  postAdminAccountPardon,
  getAdminAccountActivity,
  getAdminAccountProfileDetails,
  postAdminTeamTransferOwnership,
} = require('../controllers/AdminUserTeamControllers');

/** Admin + Support: full User & Team. Forum/Marketplace/Jobs: read + limited enforcement. */
const requireUserTeamAccess = requireStaffRole([
  'Admin',
  'Support Moderator',
  'Forum Moderator',
  'Marketplace Moderator',
  'Jobs N Gigs Moderator',
]);
/** Credits, verification, pardons, ban — Admin/Support only. Team list is readable by all User & Team roles. */
const requireUserTeamFullWrite = requireStaffRole(['Admin', 'Support Moderator']);
const {
  getAdminEconomyOverview,
  getAdminEconomyWallets,
  getAdminEconomyLedger,
  getAdminLedgerEntry,
  getAdminWalletDetail,
} = require('../controllers/AdminEconomyControllers');
/** Credits & Economy desk: Admin, and Support Moderator (no staff wallets; enforced in the service). */
const requireEconomyAccess = requireStaffRole(['Admin', 'Support Moderator']);
const {
  getAdminVideos,
  getAdminVideo,
  patchAdminVideo,
} = require('../controllers/AdminVideoControllers');
const {
  getAdminForumGroups,
  getAdminForumGroup,
  patchAdminForumGroup,
  patchAdminForumMember,
  getAdminForumDiscussions,
  getAdminForumDiscussion,
  patchAdminForumDiscussion,
  deleteAdminForumComment,
  patchAdminForumComment,
} = require('../controllers/AdminForumControllers');
const {
  getAdminModerationOverview,
  patchAdminModerationCase,
  deleteAdminModerationCase,
  postAdminModerationCaseAssignMyself,
  postAdminModerationActivityReverse,
  getAdminModerationActivity,
  getAdminModerationActivityDetail,
} = require('../controllers/AdminModerationControllers');
const {
  getAdminAnalyticsOverview,
  getAdminFinanceRecords,
  getAdminFinanceFilterOptions,
} = require('../controllers/AdminAnalyticsControllers');
const {
  getAdminTicketsOverview,
  getAdminTicketDetail,
  createAdminTicket,
  patchAdminTicket,
  postAdminTicketMessage,
  patchAdminTicketMessage,
  deleteAdminTicketMessage,
  postTicketCreditAdjustment,
  getAdminTicketArticles,
  postAdminTicketArticle,
  deleteAdminTicketArticle,
  getAdminDisputeDetail,
  patchAdminDispute,
  postAdminDisputeFinancialResolution,
  postAdminDisputeMessage,
  patchAdminDisputeMessage,
  getAdminReportDetail,
  patchAdminReport,
} = require('../controllers/AdminTicketsControllers');
const { getAdminSettingsOverview, patchAdminSettings } = require('../controllers/AdminSettingsControllers');
const { getAdminFeedbacks } = require('../controllers/AdminFeedbacksController');
const { getAdminPlans, updateAdminPlan, updateAdminPlanFeatures } = require('../controllers/AdminSubscriptionController');
const {
  createAdminStaff,
  patchAdminStaff,
  deleteAdminStaff,
  getAdminStaffRoles,
} = require('../controllers/AdminStaffControllers');

router.get('/dashboard-overview', [checkSession, requireAdmin], getAdminDashboardOverview);
router.get('/staff/roles', [checkSession, requireAdmin], getAdminStaffRoles);
router.post('/staff', [checkSession, requireAdmin], createAdminStaff);
router.patch('/staff/:staffId', [checkSession, requireAdmin], patchAdminStaff);
router.delete('/staff/:staffId', [checkSession, requireAdmin], deleteAdminStaff);
router.get('/teams-management', [checkSession, requireUserTeamAccess], getAdminTeamsManagement);
router.get('/users-management', [checkSession, requireUserTeamAccess], getAdminUsersManagement);
router.get('/accounts/:accountId/verification-details', [checkSession, requireUserTeamFullWrite], getAdminUserVerificationDetails);
router.get('/user-team-overview', [checkSession, requireUserTeamAccess], getAdminUserTeamOverview);
router.patch('/accounts/:accountId/status', [checkSession, requireUserTeamAccess], patchAdminAccountStatus);
router.patch('/accounts/:accountId/verification', [checkSession, requireUserTeamFullWrite], patchAdminAccountVerification);
router.patch('/accounts/:accountId/verification/approve', [checkSession, requireUserTeamFullWrite], approveAdminAccountVerification);
router.patch('/accounts/:accountId/verification/decline', [checkSession, requireUserTeamFullWrite], declineAdminAccountVerification);
router.patch('/accounts/:accountId/verification/resubmit', [checkSession, requireUserTeamFullWrite], resubmitAdminAccountVerification);
router.post('/accounts/:accountId/credits/adjust', [checkSession, requireUserTeamFullWrite], postAdminAccountCreditAdjust);
router.post('/accounts/:accountId/credits/freeze', [checkSession, requireUserTeamFullWrite], postAdminAccountCreditFreeze);
router.post('/accounts/:accountId/warn', [checkSession, requireUserTeamAccess], postAdminAccountWarn);
router.post('/accounts/:accountId/warnings/:violationId/rescind', [checkSession, requireUserTeamAccess], postAdminRescindWarning);
// Lifting points can clear several warnings at once, so it sits with pardon (Admin/Support).
router.get('/accounts/:accountId/warnings/lift-preview', [checkSession, requireUserTeamFullWrite], getAdminWarningLiftPreview);
router.post('/accounts/:accountId/warnings/lift', [checkSession, requireUserTeamFullWrite], postAdminLiftWarningPoints);
// Automatic merit punishments: every User & Team desk can see them; ending one early sits with
// pardon and lift (Admin / Support).
router.get('/accounts/:accountId/merit-penalties', [checkSession, requireUserTeamAccess], getAdminAccountMeritPenalties);
// Unfreeze: end several (default: all) running automatic bands and mutes at once.
router.post('/accounts/:accountId/merit-penalties/end', [checkSession, requireUserTeamFullWrite], postAdminUnfreezeAccount);
router.post('/accounts/:accountId/merit-penalties/:penaltyId/end', [checkSession, requireUserTeamFullWrite], postAdminEndMeritPenalty);
router.post('/accounts/:accountId/pardon', [checkSession, requireUserTeamFullWrite], postAdminAccountPardon);
router.get('/accounts/:accountId/activity', [checkSession, requireUserTeamAccess], getAdminAccountActivity);
router.get('/accounts/:accountId/profile', [checkSession, requireUserTeamAccess], getAdminAccountProfileDetails);
router.post('/teams/:accountId/transfer-ownership', [checkSession, requireUserTeamFullWrite], postAdminTeamTransferOwnership);
router.get('/economy-overview', [checkSession, requireEconomyAccess], getAdminEconomyOverview);
router.get('/economy/wallets', [checkSession, requireEconomyAccess], getAdminEconomyWallets);
router.get('/economy/wallets/:walletId', [checkSession, requireEconomyAccess], getAdminWalletDetail);
router.get('/economy/ledger', [checkSession, requireEconomyAccess], getAdminEconomyLedger);
router.get('/economy/ledger/:transactionId', [checkSession, requireEconomyAccess], getAdminLedgerEntry);
router.get('/moderation-overview', [checkSession, requireAdmin], getAdminModerationOverview);
router.get('/moderation/videos', [checkSession, requireAdmin], getAdminVideos);
router.get('/moderation/videos/:projectId', [checkSession, requireAdmin], getAdminVideo);
router.patch('/moderation/videos/:projectId', [checkSession, requireAdmin], patchAdminVideo);
router.get('/moderation/forum/groups', [checkSession, requireAdmin], getAdminForumGroups);
router.get('/moderation/forum/groups/:groupId', [checkSession, requireAdmin], getAdminForumGroup);
router.patch('/moderation/forum/groups/:groupId', [checkSession, requireAdmin], patchAdminForumGroup);
router.patch('/moderation/forum/groups/:groupId/members/:memberId', [checkSession, requireAdmin], patchAdminForumMember);
router.get('/moderation/forum/discussions', [checkSession, requireAdmin], getAdminForumDiscussions);
router.get('/moderation/forum/discussions/:discussionId', [checkSession, requireAdmin], getAdminForumDiscussion);
router.patch('/moderation/forum/discussions/:discussionId', [checkSession, requireAdmin], patchAdminForumDiscussion);
router.patch('/moderation/forum/discussions/:discussionId/comments/:commentId', [checkSession, requireAdmin], patchAdminForumComment);
// Hides the comment (restorable); kept for older clients.
router.delete('/moderation/forum/discussions/:discussionId/comments/:commentId', [checkSession, requireAdmin], deleteAdminForumComment);

/** Marketplace / Jobs control + Restrictions — same controllers as moderator desks. */
const MarketplaceModerator = require('../controllers/MarketplaceModeratorControllers');
const { createAdminAssetController } = require('../controllers/AssetControllers');
const JobsModerator = require('../controllers/JobsModeratorControllers');
const RestrictionDesk = require('../controllers/RestrictionDeskControllers');

router.get('/moderation/marketplace/overview', [checkSession, requireAdmin], MarketplaceModerator.getOverview);
router.get('/moderation/marketplace/listings', [checkSession, requireAdmin], MarketplaceModerator.getListings);
router.post('/moderation/marketplace/assets', [checkSession, requireAdmin], createAdminAssetController);
router.get('/moderation/marketplace/listings/:id', [checkSession, requireAdmin], MarketplaceModerator.getListingDetail);
router.patch('/moderation/marketplace/listings/:id', [checkSession, requireAdmin], MarketplaceModerator.patchListing);
router.get(
  '/moderation/marketplace/listings/:id/media/:mediaAssetId/original',
  [checkSession, requireAdmin],
  MarketplaceModerator.getListingFileOriginal
);
router.get(
  '/moderation/marketplace/users/:accountId/listings',
  [checkSession, requireAdmin],
  MarketplaceModerator.getSellerListings
);

router.get('/moderation/jobs/overview', [checkSession, requireAdmin], JobsModerator.getOverview);
router.get('/moderation/jobs/postings', [checkSession, requireAdmin], JobsModerator.getPostings);
router.get('/moderation/jobs/postings/:type/:id', [checkSession, requireAdmin], JobsModerator.getPosting);
router.patch('/moderation/jobs/postings/:type/:id', [checkSession, requireAdmin], JobsModerator.patchPosting);
router.get('/moderation/jobs/users/:accountId/history', [checkSession, requireAdmin], JobsModerator.getUserHistory);

router.get('/restrictions', [checkSession, requireAdmin], RestrictionDesk.getRestrictions);
router.get('/restrictions/lookup', [checkSession, requireAdmin], RestrictionDesk.lookupRestrictionAccounts);
router.post('/restrictions/violations', [checkSession, requireAdmin], RestrictionDesk.postViolation);
router.patch('/restrictions/accounts/:id', [checkSession, requireAdmin], RestrictionDesk.patchRestriction);
router.patch('/moderation/cases/:id', [checkSession, requireAdmin], patchAdminModerationCase);
router.delete('/moderation/cases/:id', [checkSession, requireAdmin], deleteAdminModerationCase);
router.post('/moderation/cases/:id/assign-myself', [checkSession, requireAdmin], postAdminModerationCaseAssignMyself);
router.get('/moderation/activity', [checkSession, requireAdmin], getAdminModerationActivity);
router.get('/moderation/activity/:id', [checkSession, requireAdmin], getAdminModerationActivityDetail);
router.post('/moderation/activity/:id/reverse', [checkSession, requireAdmin], postAdminModerationActivityReverse);
router.get('/analytics-overview', [checkSession, requireAdmin], getAdminAnalyticsOverview);
router.get('/analytics/finance/options', [checkSession, requireAdmin], getAdminFinanceFilterOptions);
// :kind = topups | invoices | subscriptions | cashouts; `?format=csv` downloads up to 5,000 rows.
router.get('/analytics/finance/:kind', [checkSession, requireAdmin], getAdminFinanceRecords);
router.get('/tickets-overview', [checkSession, requireAdmin], getAdminTicketsOverview);
router.post('/tickets', [checkSession, requireAdmin], createAdminTicket);
router.get('/tickets/:id', [checkSession, requireAdmin], getAdminTicketDetail);
router.patch('/tickets/:id', [checkSession, requireAdmin], patchAdminTicket);
router.post('/tickets/:id/messages', [checkSession, requireAdmin], postAdminTicketMessage);
router.patch('/tickets/:id/messages/:messageId', [checkSession, requireAdmin], patchAdminTicketMessage);
router.delete('/tickets/:id/messages/:messageId', [checkSession, requireAdmin], deleteAdminTicketMessage);
router.post('/tickets/:id/credit-adjustment', [checkSession, requireUserTeamFullWrite], postTicketCreditAdjustment);
router.get('/ticket-articles', [checkSession, requireAdmin], getAdminTicketArticles);
router.post('/ticket-articles', [checkSession, requireAdmin], postAdminTicketArticle);
router.delete('/ticket-articles/:id', [checkSession, requireAdmin], deleteAdminTicketArticle);
router.get('/disputes/:id', [checkSession, requireAdmin], getAdminDisputeDetail);
router.post('/disputes/:id/financial-resolution', [checkSession, requireAdmin], postAdminDisputeFinancialResolution);
router.post('/disputes/:id/messages', [checkSession, requireAdmin], postAdminDisputeMessage);
router.patch('/disputes/:id/messages/:messageId', [checkSession, requireAdmin], patchAdminDisputeMessage);
router.patch('/disputes/:id', [checkSession, requireAdmin], patchAdminDispute);
router.get('/reports/:id', [checkSession, requireAdmin], getAdminReportDetail);
router.patch('/reports/:id', [checkSession, requireAdmin], patchAdminReport);
router.get('/settings-overview', [checkSession, requireAdmin], getAdminSettingsOverview);
router.patch('/settings', [checkSession, requireAdmin], patchAdminSettings);

router.get('/feedbacks', [checkSession, requireAdmin], getAdminFeedbacks);

const { getAdminRateLimits, postAdminRateLimitReset } = require('../controllers/AdminRateLimitControllers');
router.get('/rate-limits', [checkSession, requireAdmin], getAdminRateLimits);
router.post('/rate-limits/reset', [checkSession, requireAdmin], postAdminRateLimitReset);

const {
  getAdminBadgeCatalog,
  getAdminBadgeRequirementTypes,
  getAdminBadgeCategories,
  postAdminBadgeCategory,
  postAdminBadge,
  patchAdminBadge,
  deleteAdminBadge,
  getAdminBadgeRecipients,
  getAdminBadgeHolders,
  postAdminBadgeGrant,
  deleteAdminBadgeGrant,
} = require('../controllers/BadgeControllers');

router.get('/badges', [checkSession, requireAdmin], getAdminBadgeCatalog);
router.post('/badges', [checkSession, requireAdmin], postAdminBadge);
router.get('/badge-requirement-types', [checkSession, requireAdmin], getAdminBadgeRequirementTypes);
router.get('/badge-categories', [checkSession, requireAdmin], getAdminBadgeCategories);
router.post('/badge-categories', [checkSession, requireAdmin], postAdminBadgeCategory);
router.get('/badges/recipients', [checkSession, requireAdmin], getAdminBadgeRecipients);
router.get('/badges/:registryId/holders', [checkSession, requireAdmin], getAdminBadgeHolders);
router.post('/badges/:registryId/grants', [checkSession, requireAdmin], postAdminBadgeGrant);
router.delete('/badges/grants/:accountBadgeId', [checkSession, requireAdmin], deleteAdminBadgeGrant);
router.patch('/badges/:badgeId', [checkSession, requireAdmin], patchAdminBadge);
router.delete('/badges/:badgeId', [checkSession, requireAdmin], deleteAdminBadge);
const {
  getWarningCatalog,
  getAdminWarningDefs,
  postAdminWarningDef,
  patchAdminWarningDef,
  deleteAdminWarningDef,
} = require('../controllers/WarningDefControllers');
const {
  getPunishmentCatalog,
  getAdminPunishmentDefs,
  postAdminPunishmentDef,
  patchAdminPunishmentDef,
  deleteAdminPunishmentDef,
} = require('../controllers/PunishmentDefControllers');
const {
  getAdminWarningThresholds,
  postAdminWarningThreshold,
  patchAdminWarningThreshold,
  deleteAdminWarningThreshold,
} = require('../controllers/WarningThresholdControllers');

router.get('/warning-catalog', [checkSession, requireUserTeamAccess], getWarningCatalog);
router.get('/punishment-catalog', [checkSession, requireUserTeamAccess], getPunishmentCatalog);
router.get('/punishment-defs', [checkSession, requireAdmin], getAdminPunishmentDefs);
router.post('/punishment-defs', [checkSession, requireAdmin], postAdminPunishmentDef);
router.patch('/punishment-defs/:punishmentDefId', [checkSession, requireAdmin], patchAdminPunishmentDef);
router.delete('/punishment-defs/:punishmentDefId', [checkSession, requireAdmin], deleteAdminPunishmentDef);
router.get('/warning-defs', [checkSession, requireAdmin], getAdminWarningDefs);
router.post('/warning-defs', [checkSession, requireAdmin], postAdminWarningDef);
router.patch('/warning-defs/:warningDefId', [checkSession, requireAdmin], patchAdminWarningDef);
router.delete('/warning-defs/:warningDefId', [checkSession, requireAdmin], deleteAdminWarningDef);
router.get('/warning-thresholds', [checkSession, requireAdmin], getAdminWarningThresholds);
router.post('/warning-thresholds', [checkSession, requireAdmin], postAdminWarningThreshold);
router.patch('/warning-thresholds/:thresholdId', [checkSession, requireAdmin], patchAdminWarningThreshold);
router.delete('/warning-thresholds/:thresholdId', [checkSession, requireAdmin], deleteAdminWarningThreshold);

const { getAdminSurveyResponsesController } = require('../controllers/AdminSurveyControllers');

router.get('/survey-responses', [checkSession, requireAdmin], getAdminSurveyResponsesController);

router.get('/subscriptions/plans', [checkSession, requireAdmin], getAdminPlans);
router.put('/subscriptions/plans/:id', [checkSession, requireAdmin], updateAdminPlan);
router.put('/subscriptions/plans/:id/features', [checkSession, requireAdmin], updateAdminPlanFeatures);

module.exports = router;
