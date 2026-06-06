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

router.get('/dashboard-overview', [checkSession, requireAdmin], getAdminDashboardOverview);
router.get('/teams-management', [checkSession, requireAdmin], getAdminTeamsManagement);
router.get('/users-management', [checkSession, requireAdmin], getAdminUsersManagement);
router.get('/user-team-overview', [checkSession, requireAdmin], getAdminUserTeamOverview);
router.get('/economy-overview', [checkSession, requireAdmin], getAdminEconomyOverview);
router.get('/moderation-overview', [checkSession, requireAdmin], getAdminModerationOverview);
router.get('/analytics-overview', [checkSession, requireAdmin], getAdminAnalyticsOverview);

module.exports = router;
