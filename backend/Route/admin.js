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
const { getAdminEconomyOverview } = require('../Controllers/AdminEconomyControllers');
const { getAdminModerationOverview } = require('../Controllers/AdminModerationControllers');
const { getAdminAnalyticsOverview } = require('../Controllers/AdminAnalyticsControllers');
const {
  getAdminTicketsOverview,
  getAdminTicketDetail,
  createAdminTicket,
  patchAdminTicket,
  postAdminTicketMessage,
  patchAdminDispute,
  patchAdminReport,
} = require('../Controllers/AdminTicketsControllers');
const { getAdminSettingsOverview, patchAdminSettings } = require('../Controllers/AdminSettingsControllers');
const { createAdminStaff, getAdminStaffRoles } = require('../Controllers/AdminStaffControllers');

router.get('/dashboard-overview', [checkSession, requireAdmin], getAdminDashboardOverview);
router.get('/staff/roles', [checkSession, requireAdmin], getAdminStaffRoles);
router.post('/staff', [checkSession, requireAdmin], createAdminStaff);
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
router.get('/moderation-overview', [checkSession, requireAdmin], getAdminModerationOverview);
router.get('/analytics-overview', [checkSession, requireAdmin], getAdminAnalyticsOverview);
router.get('/tickets-overview', [checkSession, requireAdmin], getAdminTicketsOverview);
router.post('/tickets', [checkSession, requireAdmin], createAdminTicket);
router.get('/tickets/:id', [checkSession, requireAdmin], getAdminTicketDetail);
router.patch('/tickets/:id', [checkSession, requireAdmin], patchAdminTicket);
router.post('/tickets/:id/messages', [checkSession, requireAdmin], postAdminTicketMessage);
router.patch('/disputes/:id', [checkSession, requireAdmin], patchAdminDispute);
router.patch('/reports/:id', [checkSession, requireAdmin], patchAdminReport);
router.get('/settings-overview', [checkSession, requireAdmin], getAdminSettingsOverview);
router.patch('/settings', [checkSession, requireAdmin], patchAdminSettings);

module.exports = router;
