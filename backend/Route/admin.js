const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAdmin = require('../middleware/requireAdmin');
const { getAdminDashboardOverview } = require('../Controllers/AdminControllers');
const {
  getAdminTeamsManagement,
  getAdminUsersManagement,
  getAdminUserTeamOverview,
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

router.get('/dashboard-overview', [checkSession, requireAdmin], getAdminDashboardOverview);
router.get('/teams-management', [checkSession, requireAdmin], getAdminTeamsManagement);
router.get('/users-management', [checkSession, requireAdmin], getAdminUsersManagement);
router.get('/user-team-overview', [checkSession, requireAdmin], getAdminUserTeamOverview);
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
