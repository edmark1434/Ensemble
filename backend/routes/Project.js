const express = require('express');
const router = express.Router();
const { getProjectsController, renameProjectController, deleteProjectController, restoreProjectController } = require('../controllers/ProjectControllers');
const { shareInvitationController } = require('../controllers/InvitationControllers');
const requireAuth = require('../middleware/RequireAuth');
const checkSession = require('../middleware/CheckSession');

router.get('/', [checkSession, requireAuth], getProjectsController);
router.put('/:id', [checkSession, requireAuth], renameProjectController);
router.delete('/:id', [checkSession, requireAuth], deleteProjectController);
router.post('/:id/restore', [checkSession, requireAuth], restoreProjectController);
router.post('/:id/share', [checkSession, requireAuth], shareInvitationController);

module.exports = router;
