const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAdmin = require('../middleware/requireAdmin');
const { getAdminDashboardOverview } = require('../Controllers/AdminControllers');

router.get('/dashboard-overview', [checkSession, requireAdmin], getAdminDashboardOverview);

module.exports = router;
