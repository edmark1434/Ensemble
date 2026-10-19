const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const {
    getNotificationsByAccountIdController,
    markNotificationAsReadController,
    markAllNotificationsAsReadController,
    sendDynamicEmailController
} = require('../controllers/NotificationControllers');

router.get('/', [checkSession, requireAuth], getNotificationsByAccountIdController);
router.patch('/read-all', [checkSession, requireAuth], markAllNotificationsAsReadController);
router.patch('/:notificationId/read', [checkSession, requireAuth], markNotificationAsReadController);
router.post('/send-email', [checkSession, requireAuth], sendDynamicEmailController);

module.exports = router;
