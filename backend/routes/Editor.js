const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkSession = require('../middleware/CheckSession');
const { issueEditorHandoffToken } = require('../controllers/EditorHandoffControllers');

router.get('/handoff-token', [checkSession, requireAuth], issueEditorHandoffToken);
router.post('/internal/portfolio/:id', require('../middleware/RequireInternalSecret'), require('../controllers/PortfolioClipControllers').editorClip);

module.exports = router;
