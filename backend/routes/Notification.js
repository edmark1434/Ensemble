const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const {
    getNotificationsByAccountIdController,
} = require('../controllers/NotificationControllers');

router.get('/', [checkSession, requireAuth], getNotificationsByAccountIdController);

module.exports = router;