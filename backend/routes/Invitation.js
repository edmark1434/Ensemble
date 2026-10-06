const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkSession = require('../middleware/CheckSession');
const requireInternalSecret = require('../middleware/RequireInternalSecret');
const {
    shareInvitationController,
    acceptInvitationController
} = require('../controllers/InvitationControllers');

router.post('/internal/share', requireInternalSecret, shareInvitationController);
router.get('/accept', acceptInvitationController);

module.exports = router;
