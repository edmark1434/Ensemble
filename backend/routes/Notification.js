const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const requireAdmin = require('../middleware/RequireAdmin');
const {
    getNotificationsByAccountIdController,
    markNotificationAsReadController,
    markAllNotificationsAsReadController,
    sendDynamicEmailController
} = require('../controllers/NotificationControllers');

router.get('/', [checkSession, requireAuth], getNotificationsByAccountIdController);
router.patch('/read-all', [checkSession, requireAuth], markAllNotificationsAsReadController);
router.patch('/:notificationId/read', [checkSession, requireAuth], markNotificationAsReadController);
// Sends from the platform's support address to any recipient, with caller-written subject, body and
// links. Admin only: open to members it was a phishing relay under Ensemble's name.
router.post('/send-email', [checkSession, requireAuth, requireAdmin], sendDynamicEmailController);

module.exports = router;
