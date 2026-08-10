const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const controller = require('../controllers/GoogleMeetControllers');

router.get('/oauth/callback', controller.oauthCallback);
router.get('/connect', checkSession, requireAuth, controller.connectGoogle);
router.get('/status', checkSession, requireAuth, controller.status);
router.post('/meetings', checkSession, requireAuth, controller.createMeeting);
router.get('/conversations/:conversationId/active', checkSession, requireAuth, controller.active);
router.post('/meetings/:meetingId/join', checkSession, requireAuth, controller.join);
router.post('/meetings/:meetingId/leave', checkSession, requireAuth, controller.leave);
router.post('/meetings/:meetingId/end', checkSession, requireAuth, controller.end);
router.post('/meetings/:meetingId/sync', checkSession, requireAuth, controller.sync);

module.exports = router;
