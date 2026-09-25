const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkSession = require('../middleware/CheckSession');
const {
    shareInvitationController,
    acceptInvitationController,
} = require('../controllers/InvitationControllers');

router.post('/share', [checkSession, requireAuth], shareInvitationController);
router.get('/accept', acceptInvitationController);

module.exports = router;
