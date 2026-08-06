const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');

const {
    getAllSurveysControllerBySurveyName,
    insertSurveyController
} = require('../controllers/SurveyControllers');

router.get('/:surveyName', [checkSession, requireAuth], getAllSurveysControllerBySurveyName);
router.post('/', [checkSession, requireAuth], insertSurveyController);
module.exports = router;