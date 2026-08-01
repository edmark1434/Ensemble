const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAdmin = require('../middleware/requireAdmin');
const requireStaffRole = require('../middleware/requireStaffRole');
const { getAdminDashboardOverview } = require('../Controllers/AdminControllers');
const {
  getAdminTeamsManagement,
  getAdminUsersManagement,
  getAdminUserTeamOverview,
  patchAdminAccountStatus,
  patchAdminAccountVerification,
  postAdminAccountCreditAdjust,
  postAdminAccountCreditFreeze,
  postAdminAccountWarn,
  postAdminAccountPardon,
} = require('../Controllers/AdminUserTeamControllers');

/** Admin + Support: full User & Team. Forum/Marketplace: read + limited enforcement. */
const requireUserTeamAccess = requireStaffRole([
  'Admin',
  'Support Moderator',
  'Forum Moderator',
  'Marketplace Moderator',
  'Jobs N Gigs Moderator',
]);
/** Credits, verification, pardons, team management, ban — Admin/Support only. */
const requireUserTeamFullWrite = requireStaffRole(['Admin', 'Support Moderator']);
const {
  getAdminEconomyOverview,
  getAdminWalletDetail,
} = require('../Controllers/AdminEconomyControllers');
const {
  getAdminModerationOverview,
  patchAdminModerationCase,
  deleteAdminModerationCase,
  postAdminModerationCaseAssignMyself,
} = require('../Controllers/AdminModerationControllers');
const { getAdminAnalyticsOverview } = require('../Controllers/AdminAnalyticsControllers');
const {
  getAdminTicketsOverview,
  getAdminTicketDetail,
  createAdminTicket,
  patchAdminTicket,
  postAdminTicketMessage,
  getAdminDisputeDetail,
  patchAdminDispute,
  postAdminDisputeMessage,
  patchAdminDisputeMessage,
  getAdminReportDetail,
  patchAdminReport,
} = require('../Controllers/AdminTicketsControllers');
const { getAdminSettingsOverview, patchAdminSettings } = require('../Controllers/AdminSettingsControllers');
const {
  createAdminStaff,
  patchAdminStaff,
  deleteAdminStaff,
  getAdminStaffRoles,
} = require('../Controllers/AdminStaffControllers');

router.get('/dashboard-overview', [checkSession, requireAdmin], getAdminDashboardOverview);
router.get('/staff/roles', [checkSession, requireAdmin], getAdminStaffRoles);
router.post('/staff', [checkSession, requireAdmin], createAdminStaff);
router.patch('/staff/:staffId', [checkSession, requireAdmin], patchAdminStaff);
router.delete('/staff/:staffId', [checkSession, requireAdmin], deleteAdminStaff);
router.get('/teams-management', [checkSession, requireUserTeamFullWrite], getAdminTeamsManagement);
router.get('/users-management', [checkSession, requireUserTeamAccess], getAdminUsersManagement);
router.get('/user-team-overview', [checkSession, requireUserTeamAccess], getAdminUserTeamOverview);
router.patch('/accounts/:accountId/status', [checkSession, requireUserTeamAccess], patchAdminAccountStatus);
router.patch('/accounts/:accountId/verification', [checkSession, requireUserTeamFullWrite], patchAdminAccountVerification);
router.post('/accounts/:accountId/credits/adjust', [checkSession, requireUserTeamFullWrite], postAdminAccountCreditAdjust);
router.post('/accounts/:accountId/credits/freeze', [checkSession, requireUserTeamFullWrite], postAdminAccountCreditFreeze);
router.post('/accounts/:accountId/warn', [checkSession, requireUserTeamAccess], postAdminAccountWarn);
router.post('/accounts/:accountId/pardon', [checkSession, requireUserTeamFullWrite], postAdminAccountPardon);
router.get('/economy-overview', [checkSession, requireAdmin], getAdminEconomyOverview);
router.get('/economy/wallets/:walletId', [checkSession, requireAdmin], getAdminWalletDetail);
router.get('/moderation-overview', [checkSession, requireAdmin], getAdminModerationOverview);
router.patch('/moderation/cases/:id', [checkSession, requireAdmin], patchAdminModerationCase);
router.delete('/moderation/cases/:id', [checkSession, requireAdmin], deleteAdminModerationCase);
router.post('/moderation/cases/:id/assign-myself', [checkSession, requireAdmin], postAdminModerationCaseAssignMyself);
router.get('/analytics-overview', [checkSession, requireAdmin], getAdminAnalyticsOverview);
router.get('/tickets-overview', [checkSession, requireAdmin], getAdminTicketsOverview);
router.post('/tickets', [checkSession, requireAdmin], createAdminTicket);
router.get('/tickets/:id', [checkSession, requireAdmin], getAdminTicketDetail);
router.patch('/tickets/:id', [checkSession, requireAdmin], patchAdminTicket);
router.post('/tickets/:id/messages', [checkSession, requireAdmin], postAdminTicketMessage);
router.get('/disputes/:id', [checkSession, requireAdmin], getAdminDisputeDetail);
router.post('/disputes/:id/messages', [checkSession, requireAdmin], postAdminDisputeMessage);
router.patch('/disputes/:id/messages/:messageId', [checkSession, requireAdmin], patchAdminDisputeMessage);
router.patch('/disputes/:id', [checkSession, requireAdmin], patchAdminDispute);
router.get('/reports/:id', [checkSession, requireAdmin], getAdminReportDetail);
router.patch('/reports/:id', [checkSession, requireAdmin], patchAdminReport);
router.get('/settings-overview', [checkSession, requireAdmin], getAdminSettingsOverview);
router.patch('/settings', [checkSession, requireAdmin], patchAdminSettings);

module.exports = router;
