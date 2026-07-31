const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
const {
    getNotificationsByAccountIdController,
} = require('../Controllers/NotificationControllers');

router.get('/', [checkSession, requireAuth], getNotificationsByAccountIdController);

module.exports = router;