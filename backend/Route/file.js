const router = require('express').Router();
const {
    getAllProfileFilesController,
    generateUploadUrlController,
    uploadFileToS3Controller
} = require('../Controllers/FileControllers');

const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');

router.get('/profile-presets', [checkSession, requireAuth], getAllProfileFilesController);
router.post('/upload-url', [checkSession, requireAuth], generateUploadUrlController);
router.post('/upload-file', [checkSession, requireAuth], uploadFileToS3Controller);
module.exports = router;