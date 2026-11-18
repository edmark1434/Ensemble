const express = require('express');
const router = express.Router();
const {
    getVideoUploadPolicyController,
    getAllProfileFilesController,
    generateUploadUrlController,
    uploadFileToIntentController,
    registerFileController
} = require('../controllers/FileControllers');

const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');

router.get('/profile-presets', [checkSession, requireAuth], getAllProfileFilesController);
router.get('/video-upload-policy', [checkSession, requireAuth], getVideoUploadPolicyController);
router.post('/upload-url', [checkSession, requireAuth], generateUploadUrlController);
router.put(
    '/upload/:uploadIntentId',
    [checkSession, requireAuth, express.raw({ type: '*/*', limit: '1024mb' })],
    uploadFileToIntentController
);
router.post('/finalize', [checkSession, requireAuth], registerFileController);
// Backward-compatible path with the same ownership-bound intent contract.
router.post('/register', [checkSession, requireAuth], registerFileController);

module.exports = router;
