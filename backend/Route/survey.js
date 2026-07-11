const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');

const {
    getAllSurveysControllerBySurveyName,
    insertSurveyController
} = require('../Controllers/SurveyControllers');

router.get('/:surveyName', [checkSession, requireAuth], getAllSurveysControllerBySurveyName);
router.post('/', [checkSession, requireAuth], insertSurveyController);
module.exports = router;