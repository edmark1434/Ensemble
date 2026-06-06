const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAdmin = require('../middleware/requireAdmin');
const { getAdminDashboardOverview } = require('../Controllers/AdminControllers');
const {
  getAdminTeamsManagement,
  getAdminUsersManagement,
} = require('../Controllers/AdminUserTeamControllers');
const { getAdminEconomyOverview } = require('../Controllers/AdminEconomyControllers');
const { getAdminModerationOverview } = require('../Controllers/AdminModerationControllers');

router.get('/dashboard-overview', [checkSession, requireAdmin], getAdminDashboardOverview);
router.get('/teams-management', [checkSession, requireAdmin], getAdminTeamsManagement);
router.get('/users-management', [checkSession, requireAdmin], getAdminUsersManagement);
router.get('/economy-overview', [checkSession, requireAdmin], getAdminEconomyOverview);
router.get('/moderation-overview', [checkSession, requireAdmin], getAdminModerationOverview);

module.exports = router;
