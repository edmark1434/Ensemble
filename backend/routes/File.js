const router = require('express').Router();
const {
    getAllProfileFilesController,
    generateUploadUrlController,
    registerFileController
} = require('../controllers/FileControllers');

const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');

router.get('/profile-presets', [checkSession, requireAuth], getAllProfileFilesController);
router.post('/upload-url', [checkSession, requireAuth], generateUploadUrlController);
router.post('/finalize', [checkSession, requireAuth], registerFileController);
// Backward-compatible path with the same ownership-bound intent contract.
router.post('/register', [checkSession, requireAuth], registerFileController);

module.exports = router;
