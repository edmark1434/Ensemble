const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAdmin = require('../middleware/requireAdmin');
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
const {
  getAdminEconomyOverview,
  getAdminWalletDetail,
} = require('../Controllers/AdminEconomyControllers');
const {
  getAdminModerationOverview,
  patchAdminModerationCase,
  deleteAdminModerationCase,
  postAdminModerationCaseTakeOver,
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
router.get('/teams-management', [checkSession, requireAdmin], getAdminTeamsManagement);
router.get('/users-management', [checkSession, requireAdmin], getAdminUsersManagement);
router.get('/user-team-overview', [checkSession, requireAdmin], getAdminUserTeamOverview);
router.patch('/accounts/:accountId/status', [checkSession, requireAdmin], patchAdminAccountStatus);
router.patch('/accounts/:accountId/verification', [checkSession, requireAdmin], patchAdminAccountVerification);
router.post('/accounts/:accountId/credits/adjust', [checkSession, requireAdmin], postAdminAccountCreditAdjust);
router.post('/accounts/:accountId/credits/freeze', [checkSession, requireAdmin], postAdminAccountCreditFreeze);
router.post('/accounts/:accountId/warn', [checkSession, requireAdmin], postAdminAccountWarn);
router.post('/accounts/:accountId/pardon', [checkSession, requireAdmin], postAdminAccountPardon);
router.get('/economy-overview', [checkSession, requireAdmin], getAdminEconomyOverview);
router.get('/economy/wallets/:walletId', [checkSession, requireAdmin], getAdminWalletDetail);
router.get('/moderation-overview', [checkSession, requireAdmin], getAdminModerationOverview);
router.patch('/moderation/cases/:id', [checkSession, requireAdmin], patchAdminModerationCase);
router.delete('/moderation/cases/:id', [checkSession, requireAdmin], deleteAdminModerationCase);
router.post('/moderation/cases/:id/take-over', [checkSession, requireAdmin], postAdminModerationCaseTakeOver);
router.get('/analytics-overview', [checkSession, requireAdmin], getAdminAnalyticsOverview);
router.get('/tickets-overview', [checkSession, requireAdmin], getAdminTicketsOverview);
router.post('/tickets', [checkSession, requireAdmin], createAdminTicket);
router.get('/tickets/:id', [checkSession, requireAdmin], getAdminTicketDetail);
router.patch('/tickets/:id', [checkSession, requireAdmin], patchAdminTicket);
router.post('/tickets/:id/messages', [checkSession, requireAdmin], postAdminTicketMessage);
router.get('/disputes/:id', [checkSession, requireAdmin], getAdminDisputeDetail);
router.post('/disputes/:id/messages', [checkSession, requireAdmin], postAdminDisputeMessage);
router.patch('/disputes/:id', [checkSession, requireAdmin], patchAdminDispute);
router.get('/reports/:id', [checkSession, requireAdmin], getAdminReportDetail);
router.patch('/reports/:id', [checkSession, requireAdmin], patchAdminReport);
router.get('/settings-overview', [checkSession, requireAdmin], getAdminSettingsOverview);
router.patch('/settings', [checkSession, requireAdmin], patchAdminSettings);

module.exports = router;
