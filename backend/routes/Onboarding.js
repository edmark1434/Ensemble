const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const { getState, createAvatarUpload, saveAvatarStep, finalizeAvatar, saveSurvey, changeStep, finish } = require('../controllers/OnboardingControllers');

router.use(checkSession, requireAuth);
router.get('/state', getState);
router.post('/avatar-upload-url', createAvatarUpload);
router.post('/avatar', saveAvatarStep);
router.post('/avatar/finalize', finalizeAvatar);
router.post('/survey-progress', saveSurvey);
router.post('/current-step', changeStep);
router.post('/complete', finish);

module.exports = router;
